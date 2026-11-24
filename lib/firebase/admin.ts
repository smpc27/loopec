import "server-only";

import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;
let adminDb: Firestore | undefined;

export function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey && projectId) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  }

  if (projectId) {
    adminApp = initializeApp({
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  }

  return null;
}

export function getFirebaseAdminDb(): Firestore | null {
  if (!adminDb) {
    const app = getFirebaseAdminApp();
    if (app) {
      adminDb = getFirestore(app);
    }
  }
  return adminDb || null;
}
