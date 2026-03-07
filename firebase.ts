
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCe9rK6QuAFizUTYDpWbfeYFK0lh1sVECI",
  authDomain: "toletbrofinal.firebaseapp.com",
  projectId: "toletbrofinal",
  storageBucket: "toletbrofinal.firebasestorage.app",
  messagingSenderId: "485806582630",
  appId: "1:485806582630:web:36e3acf1d535dec97b76a7",
  measurementId: "G-7WBK3YG91H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Initialize Firestore with settings to avoid "client is offline" errors in restricted environments (like iframes)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);

export default app;
