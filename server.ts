import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { MOCK_USERS, MOCK_PROPERTIES } from "./constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore;

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      console.log("Attempting to initialize Firebase Admin with Service Account Key...");
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || "toletbrofinal"
        });
        console.log("Firebase Admin initialized successfully with Service Account");
      }
    } catch (parseErr: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", parseErr.message);
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: "toletbrofinal",
        });
        console.log("Firebase Admin initialized with Project ID fallback (Parse Error)");
      }
    }
  } else {
    if (admin.apps.length === 0) {
      try {
        // Try to use application default credentials if available
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: "toletbrofinal"
        });
        console.log("Firebase Admin initialized with Application Default Credentials");
      } catch (defaultErr: any) {
        console.log("Default credentials not found, trying with Project ID only:", defaultErr.message);
        admin.initializeApp({
          projectId: "toletbrofinal",
        });
        console.log("Firebase Admin initialized with Project ID fallback (No Key)");
      }
    }
  }
} catch (err: any) {
  console.error("Firebase Admin initialization error:", err.message);
  // Last resort: initialize with project ID if not already initialized
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: "toletbrofinal" });
  }
}

// Initialize db after Admin is ready
db = admin.firestore();
// Set settings to handle potential connectivity issues
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  console.warn("Could not set Firestore settings:", e);
}
console.log("Firestore instance initialized for project: toletbrofinal");

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  console.log("Express middleware configured");

  // Debug Firebase Status
  app.get("/api/debug/firebase", async (req, res) => {
    try {
      const collections = await db.listCollections();
      res.json({
        status: "connected",
        initialized: !!admin.apps.length,
        collections: collections.map(c => c.id),
        usingServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        message: error.message,
        initialized: !!admin.apps.length,
        hasKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      });
    }
  });

  // QR Code Owner Lookup API
  app.get("/api/owner/lookup", async (req, res) => {
    const { serial } = req.query;
    if (!serial) return res.status(400).json({ error: "Serial is required" });

    const upperSerial = (serial as string).toUpperCase();

    try {
      console.log(`Looking up owner for serial: ${upperSerial}`);
      
      // 1. Try finding by qrCode field
      const usersRef = db.collection("users");
      let qrQuery;
      try {
        qrQuery = await usersRef.where("qrCode", "==", upperSerial).get();
      } catch (dbErr: any) {
        const isPermissionError = dbErr.message?.includes("PERMISSION_DENIED") || 
                                 dbErr.message?.includes("permission") || 
                                 dbErr.code === 7 || 
                                 dbErr.code === "permission-denied";
        
        if (isPermissionError) {
          console.warn("Firestore Permission Denied (qrCode lookup). Using mock data fallback.");
          const mockOwner = MOCK_USERS.find(u => u.qrCode === upperSerial || u.id === serial);
          if (mockOwner) {
            return res.json({ 
              owner: mockOwner, 
              properties: MOCK_PROPERTIES.filter(p => p.ownerId === mockOwner.id),
              warning: "Using mock data due to database permission issues"
            });
          } else {
            return res.status(404).json({ 
              error: "Owner not found", 
              message: "Database access denied and no mock data available.",
              isPermissionError: true
            });
          }
        }
        
        console.error("Firestore Query Error (qrCode):", dbErr.message, "Code:", dbErr.code);
        throw dbErr;
      }
      
      let ownerData: any = null;

      if (!qrQuery.empty) {
        const doc = qrQuery.docs[0];
        ownerData = { ...doc.data(), id: doc.id };
      } else {
        // 2. Try finding by document ID
        try {
          const userDoc = await usersRef.doc(serial as string).get();
          if (userDoc.exists) {
            ownerData = { ...userDoc.data(), id: userDoc.id };
          }
        } catch (dbErr: any) {
          console.error("Firestore Doc Error (userId):", dbErr.message);
          // Don't throw here, maybe it's just not found by ID
        }
      }

      if (!ownerData) {
        console.log(`No owner found for serial: ${upperSerial}`);
        return res.status(404).json({ error: "Owner not found" });
      }

      console.log(`Owner found: ${ownerData.id}. Fetching properties...`);

      // 3. Fetch active properties for this owner
      const propsRef = db.collection("properties");
      let propsQuery;
      try {
        propsQuery = await propsRef
          .where("ownerId", "==", ownerData.id)
          .where("status", "==", "active")
          .get();
      } catch (dbErr: any) {
        console.error("Firestore Properties Query Error:", dbErr.message);
        // We have the owner, so we can still return the owner even if properties fail
        return res.json({ owner: ownerData, properties: [], warning: "Failed to fetch properties" });
      }

      const properties = propsQuery.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.isSystemQR);

      console.log(`Found ${properties.length} properties for owner ${ownerData.id}`);
      res.json({ owner: ownerData, properties });
    } catch (error: any) {
      console.error("Owner Lookup Error Detail:", error);
      res.status(500).json({ 
        error: "Failed to lookup owner", 
        message: error.message,
        code: error.code 
      });
    }
  });

  // Google Geocoding API Proxy
  app.get("/api/geocode/reverse", async (req, res) => {
    console.log("Reverse geocode request received");
    const { lat, lng } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API Key not configured" });
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Reverse Geocoding Error:", error);
      res.status(500).json({ error: "Failed to fetch address" });
    }
  });

  app.get("/api/geocode/forward", async (req, res) => {
    console.log("Forward geocode request received");
    const { address } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API Key not configured" });
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${apiKey}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Forward Geocoding Error:", error);
      res.status(500).json({ error: "Failed to fetch coordinates" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite in middleware mode...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
        root: __dirname,
      });
      
      // Use vite's connect instance as middleware
      app.use(vite.middlewares);
      console.log("Vite middleware loaded successfully");
    } catch (err) {
      console.error("Failed to initialize Vite server:", err);
      throw err;
    }
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("(.*)", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from dist");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
