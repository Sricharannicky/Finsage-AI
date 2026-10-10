import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore as getFS, type Firestore } from "firebase-admin/firestore";

const globalForFirebase = globalThis as unknown as {
  firebaseAdminApp: App | undefined;
};

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  // Defensive cleanup for the most common paste mistakes (Vercel dashboard):
  // surrounding quotes copied from .env-style examples, stray whitespace.
  // No-op for correctly pasted keys.
  const unquoted = raw.trim().replace(/^["']|["']$/g, "");
  // Support \n-escaped private keys from .env
  return unquoted.replace(/\\n/g, "\n");
}

/** Project ID embedded in a service-account email
 *  (firebase-adminsdk-…@<project>.iam.gserviceaccount.com).
 *  Project IDs are public identifiers — safe to log and return. */
function projectFromClientEmail(clientEmail: string | undefined): string | null {
  if (!clientEmail || !clientEmail.includes("@")) return null;
  const domain = clientEmail.split("@")[1] || "";
  const suffix = ".iam.gserviceaccount.com";
  if (!domain.endsWith(suffix)) return null;
  return domain.slice(0, -suffix.length) || null;
}

export interface AdminKeyShape {
  present: boolean;
  hasBeginMarker: boolean;
  hasEndMarker: boolean;
  hasLineBreaks: boolean;
  wasWrappedInQuotes: boolean;
  approxLength: number;
}

export interface AdminDiagnostics {
  configured: boolean;
  /** FIREBASE_PROJECT_ID as set (public identifier, safe). Null when missing. */
  projectIdEnv: string | null;
  /** Project embedded in FIREBASE_CLIENT_EMAIL (public identifier, safe). Null when unparseable. */
  emailProject: string | null;
  /** Whether both point at the same project. Null when either is undeterminable. */
  projectMatch: boolean | null;
  /** Structural checks on the key — booleans/length only, never content. */
  keyShape: AdminKeyShape;
}

/** Safe diagnostics: answers "is this the right key for the right project"
 *  without ever exposing the key, email, tokens, or user data. */
export function getAdminDiagnostics(): AdminDiagnostics {
  const projectIdEnv = process.env.FIREBASE_PROJECT_ID || null;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;
  const emailProject = projectFromClientEmail(clientEmail || undefined);
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  const key = getPrivateKey();
  const wasWrappedInQuotes = !!raw && raw.trim() !== raw.trim().replace(/^["']|["']$/g, "");
  return {
    configured: isFirebaseConfigured(),
    projectIdEnv,
    emailProject,
    projectMatch: projectIdEnv && emailProject ? projectIdEnv === emailProject : null,
    keyShape: {
      present: !!key,
      hasBeginMarker: !!key?.includes("-----BEGIN PRIVATE KEY-----"),
      hasEndMarker: !!key?.includes("-----END PRIVATE KEY-----"),
      hasLineBreaks: !!key?.includes("\n"),
      wrappedInQuotes: wasWrappedInQuotes,
      approxLength: key?.length ?? 0,
    },
  };
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
    // Log code + message only — never the credential that failed to parse.
    const e = err as any;
    console.error(
      "[firebase] failed to initialize admin SDK:",
      e?.code || "init-error",
      String(e?.message || err).slice(0, 200)
    );
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
    const e = err as any;
    console.error(
      "[firebase] getFirestore failed:",
      e?.code || "firestore-error",
      String(e?.message || err).slice(0, 200)
    );
    return null;
  }
}
