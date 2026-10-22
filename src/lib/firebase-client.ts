// Firebase CLIENT SDK (browser) — used only for Google sign-in popup.
// Public config (safe to expose, must start with NEXT_PUBLIC_):
//   NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Clean up any stale legacy credentials from previous iterations
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("finsage_google_cred");
  } catch {}
}

export function isGoogleLoginConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
}

/** True when running inside Capacitor Android app */
export function isNativeApp(): boolean {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    return w.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function buildProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  // Force account chooser so returning users see their saved accounts
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/** Maps Firebase/network errors to friendly messages */
export function friendlyGoogleError(err: any): string {
  const code: string | undefined = err?.code;
  switch (code) {
    case "auth/popup-blocked":
      return "Pop-up blocked: In Safari, click Safari menu > Settings for localhost... > Pop-up Windows: Allow (or enable pop-ups in your browser settings).";
    case "auth/network-request-failed":
      return "Unable to connect to Google. Check your internet connection.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth. Add localhost to Authorized Domains in Firebase Console.";
    case "auth/popup-closed-by-user":
    case "auth/user-cancelled":
      return "Google sign-in was closed before finishing.";
    case "auth/cancelled-popup-request":
      return "Another Google sign-in window is already open.";
    case "auth/web-storage-unsupported":
      return "Your browser is blocking cookies/storage needed for Google sign-in. Please test in a standard (non-incognito) window or allow cookies.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists. Please sign in with your email and password.";
    default:
      break;
  }
  if (err instanceof Error && err.message && err.message !== "Failed to fetch") return err.message;
  if (code) return `Google sign-in failed (${code}).`;
  return "Google sign-in failed. Please try again.";
}

function getClientAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!isGoogleLoginConfigured()) return null;
  try {
    if (!app) {
      app =
        getApps()[0] ||
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        });
    }
    if (!auth) auth = getAuth(app);
    return auth;
  } catch (err) {
    console.error("[firebase-client] init failed:", err);
    return null;
  }
}

// Pre-initialize Firebase Auth on browser load so it is already warm and ready on user click
if (typeof window !== "undefined") {
  try {
    getClientAuth();
  } catch {}
}

/**
 * Directly opens the Google popup showing account chooser.
 * Synchronously triggers signInWithPopup on user gesture to avoid popup blockers.
 */
export function signInWithGoogle(): Promise<string> {
  const a = getClientAuth();
  if (!a) {
    return Promise.reject(
      new Error(
        "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env."
      )
    );
  }
  const provider = buildProvider();
  // Synchronous execution in the user's click gesture stack
  return signInWithPopup(a, provider).then((cred) => cred.user.getIdToken(true));
}

export function isPopupBlockedError(err: any): boolean {
  return (
    err?.code === "auth/popup-blocked" ||
    err?.code === "auth/operation-not-supported-in-this-environment"
  );
}

export function isRedirectingError(err: any): boolean {
  return false;
}

export async function signInWithGoogleRedirect(): Promise<never> {
  throw new Error("Redirect flow is disabled on localhost. Please use the popup sign-in.");
}

export async function consumeGoogleRedirect(): Promise<string | null> {
  return null;
}

export async function autoSignInWithGoogle(): Promise<string | null> {
  return null;
}

export function onGoogleAuthStateChanged(cb: (user: User | null) => void): () => void {
  return () => {};
}

export async function resetGoogleAuthState(): Promise<void> {
  const a = getClientAuth();
  if (!a) return;
  try {
    await firebaseSignOut(a);
  } catch {}
}
