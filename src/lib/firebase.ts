import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase bootstrap with graceful demo fallback.
 *
 * The studio site runs in two modes:
 *  - LIVE: all VITE_FIREBASE_* env vars are set (wired by the owner in the
 *    Firebase console + hosting env). Firestore persistence is real.
 *  - DEMO: env vars are absent. Every feature keeps working against local
 *    mock state so prospects and reviewers get zero-friction testing.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isDemoMode: boolean = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

if (!isDemoMode) {
  app = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(app);
  firebaseAuth = getAuth(app);
}

export const db: Firestore | null = firestoreDb;
export const auth: Auth | null = firebaseAuth;
export const firebaseApp: FirebaseApp | null = app;
