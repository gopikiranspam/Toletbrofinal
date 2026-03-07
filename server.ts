import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: "toletbrofinal",
  });
  console.log("Firebase Admin initialized");
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
}

const db = admin.firestore();

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  console.log("Express middleware configured");

  // QR Code Owner Lookup API
  app.get("/api/owner/lookup", async (req, res) => {
    const { serial } = req.query;
    if (!serial) return res.status(400).json({ error: "Serial is required" });

    const upperSerial = (serial as string).toUpperCase();

    try {
      console.log(`Looking up owner for serial: ${upperSerial}`);
      
      // 1. Try finding by qrCode field
      const usersRef = db.collection("users");
      const qrQuery = await usersRef.where("qrCode", "==", upperSerial).get();
      
      let ownerData: any = null;

      if (!qrQuery.empty) {
        const doc = qrQuery.docs[0];
        ownerData = { ...doc.data(), id: doc.id };
      } else {
        // 2. Try finding by document ID
        const userDoc = await usersRef.doc(serial as string).get();
        if (userDoc.exists) {
          ownerData = { ...userDoc.data(), id: userDoc.id };
        }
      }

      if (!ownerData) {
        return res.status(404).json({ error: "Owner not found" });
      }

      // 3. Fetch active properties for this owner
      const propsRef = db.collection("properties");
      const propsQuery = await propsRef
        .where("ownerId", "==", ownerData.id)
        .where("status", "==", "active")
        .get();

      const properties = propsQuery.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.isSystemQR);

      res.json({ owner: ownerData, properties });
    } catch (error) {
      console.error("Owner Lookup Error:", error);
      res.status(500).json({ error: "Failed to lookup owner" });
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
