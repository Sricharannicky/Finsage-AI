import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore as getFS, type Firestore } from "firebase-admin/firestore";

const globalForFirebase = globalThis as unknown as {
  firebaseAdminApp: App | undefined;
};

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  // Support \n-escaped private keys from .env
  return raw.replace(/\\n/g, "\n");
}

function initApp(): App | null {
  if (globalForFirebase.firebaseAdminApp) {
    return globalForFirebase.firebaseAdminApp;
  }
  const existing = getApps();
  if (existing.length > 0) {
    globalForFirebase.firebaseAdminApp = existing[0]!;
    return existing[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    if (process.env.NODE_ENV !== "production") {
      globalForFirebase.firebaseAdminApp = app;
    }
    return app;
  } catch (err) {
    console.error("[firebase] failed to initialize admin SDK:", err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getAdminApp(): App | null {
  return initApp();
}

export function getFirestore(): Firestore | null {
  const app = initApp();
  if (!app) return null;
  try {
    return getFS(app);
  } catch (err) {
    console.error("[firebase] getFirestore failed:", err);
    return null;
  }
}
