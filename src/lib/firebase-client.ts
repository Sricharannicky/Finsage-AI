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
  onAuthStateChanged,
  signInWithCredential,
  type Auth,
  type User,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Stores the Google credential locally so returning users can be re-signed in without re-prompting.
let googleCredential: { idToken: string; refreshToken: string } | null = null;
try {
  const stored = typeof window !== "undefined" ? localStorage.getItem("finsage_google_cred") : null;
  if (stored) googleCredential = JSON.parse(stored);
} catch {}

function storeGoogleCredential(cred: { idToken: string; refreshToken: string }) {
  googleCredential = cred;
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("finsage_google_cred", JSON.stringify(cred));
    }
  } catch {}
}

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

/** Opens the Google popup showing previously used accounts when available. */
export async function signInWithGoogle(): Promise<string> {
  const a = getClientAuth();
  if (!a) {
    throw new Error(
      "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env (see .env.example)."
    );
  }
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  // Force account chooser so returning users see their saved accounts
  provider.setCustomParameters({ prompt: "select_account" });

  // If we have a stored credential, try silent sign-in first.
  // Fall back to popup if silent sign-in fails (e.g. expired token).
  if (googleCredential) {
    try {
      const cred = GoogleAuthProvider.credential(googleCredential.idToken);
      const result = await signInWithCredential(a, cred);
      const token = await result.user.getIdToken();
      storeGoogleCredential({ idToken: token, refreshToken: result.user.refreshToken });
      return token;
    } catch {
      // stale credential — fall through to popup
    }
  }

  const cred = await signInWithPopup(a, provider);
  const token = await cred.user.getIdToken();
  storeGoogleCredential({ idToken: token, refreshToken: cred.user.refreshToken });
  return token;
}

/** Returns true if the user is already signed in (session persisted). */
export function onGoogleAuthStateChanged(cb: (user: User | null) => void): () => void {
  const a = getClientAuth();
  if (!a) return () => {};
  return onAuthStateChanged(a, cb);
}

/** Auto-sign-in a returning Google user if a valid session exists. Returns the ID token or null. */
export async function autoSignInWithGoogle(): Promise<string | null> {
  const a = getClientAuth();
  if (!a || !googleCredential) return null;
  try {
    const cred = GoogleAuthProvider.credential(googleCredential.idToken);
    const result = await signInWithCredential(a, cred);
    const token = await result.user.getIdToken();
    storeGoogleCredential({ idToken: token, refreshToken: result.user.refreshToken });
    return token;
  } catch {
    return null;
  }
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
    return await result.user.getIdToken();
  } catch {
    return null;
  }
}
