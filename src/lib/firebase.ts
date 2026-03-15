import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Import the Firebase configuration
import firebaseConfig from '../../firebase-applet-config.json';

// Only initialize if API key is present
const isConfigured = !!firebaseConfig.apiKey;

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  // Respect the named database if it's provided
  db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}

export { auth, db };
