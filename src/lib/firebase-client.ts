// Firebase CLIENT SDK (browser) — used only for Google sign-in popup.
// Public config (safe to expose, must start with NEXT_PUBLIC_):
//   NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
// Get them: Firebase Console → Project Settings → General → Your apps → Web app (</>).
"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type Auth,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function isGoogleLoginConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
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

/** Opens the Google popup and returns a Firebase ID token for our server to verify. */
export async function signInWithGoogle(): Promise<string> {
  const a = getClientAuth();
  if (!a) {
    throw new Error(
      "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env (see .env.example)."
    );
  }
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(a, provider);
  return cred.user.getIdToken();
}

export function isPopupBlockedError(err: any): boolean {
  return err?.code === "auth/popup-blocked";
}

/** Fallback when the browser blocks popups: full-page redirect to Google. */
export async function signInWithGoogleRedirect(): Promise<never> {
  const a = getClientAuth();
  if (!a) {
    throw new Error(
      "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env (see .env.example)."
    );
  }
  await signInWithRedirect(a, new GoogleAuthProvider());
  throw new Error("Redirecting to Google…");
}

/** Call on page load: completes a redirect sign-in and returns its ID token, or null. */
export async function consumeGoogleRedirect(): Promise<string | null> {
  const a = getClientAuth();
  if (!a) return null;
  try {
    const result = await getRedirectResult(a);
    if (!result?.user) return null;
    return result.user.getIdToken();
  } catch {
    return null;
  }
}
