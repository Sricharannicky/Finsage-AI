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

/** True when running inside the Capacitor Android app (single-window WebView). */
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

/** Maps Firebase/network errors to messages the user can act on. */
export function friendlyGoogleError(err: any): string {
  const code: string | undefined = err?.code;
  switch (code) {
    case "auth/network-request-failed":
      return "Can't reach Google. Check your internet connection and try again.";
    case "auth/unauthorized-domain":
      return "This app address isn't authorized for Google sign-in yet. Please use email sign-in for now.";
    case "auth/popup-closed-by-user":
    case "auth/user-cancelled":
      return "Google sign-in was closed before finishing. Try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open. Please finish it or try again.";
    case "auth/operation-not-supported-in-this-environment":
      return "Google pop-up sign-in isn't supported here — redirecting to Google instead…";
    case "auth/web-storage-unsupported":
      return "Your browser blocks the storage Google sign-in needs. Allow cookies/site data and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists. Sign in with your password instead.";
    default:
      break;
  }
  if (err instanceof Error && err.message && err.message !== "Failed to fetch") return err.message;
  if (code) return `Google sign-in failed (${code}). Please try again.`;
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

/** Opens the Google popup showing previously used accounts when available. */
export async function signInWithGoogle(): Promise<string> {
  const a = getClientAuth();
  if (!a) {
    throw new Error(
      "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env (see .env.example)."
    );
  }
  // Inside the Android app popups can't open (single-window WebView),
  // so go straight to full-page redirect instead of a doomed popup.
  if (isNativeApp()) {
    await signInWithGoogleRedirect();
  }
  const provider = buildProvider();

  // If we have a stored credential, try silent sign-in first.
  // Fall back to popup if silent sign-in fails (e.g. expired token).
  if (googleCredential) {
    try {
      const cred = GoogleAuthProvider.credential(googleCredential.idToken);
      const result = await signInWithCredential(a, cred);
      // Force refresh: never exchange a cached/stale token with our server.
      const token = await result.user.getIdToken(true);
      storeGoogleCredential({ idToken: token, refreshToken: result.user.refreshToken });
      return token;
    } catch {
      // stale credential — fall through to popup
    }
  }

  const cred = await signInWithPopup(a, provider);
  // Force refresh: guarantees the token sent to /api/auth/google is fresh.
  const token = await cred.user.getIdToken(true);
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
    const token = await result.user.getIdToken(true);
    storeGoogleCredential({ idToken: token, refreshToken: result.user.refreshToken });
    return token;
  } catch {
    return null;
  }
}

export function isPopupBlockedError(err: any): boolean {
  // WebViews / in-app browsers throw operation-not-supported instead of
  // popup-blocked; both mean "fall back to full-page redirect".
  return (
    err?.code === "auth/popup-blocked" ||
    err?.code === "auth/operation-not-supported-in-this-environment"
  );
}

/** Fallback when the browser blocks popups: full-page redirect to Google. */
export async function signInWithGoogleRedirect(): Promise<never> {
  const a = getClientAuth();
  if (!a) {
    throw new Error(
      "Google login is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to .env (see .env.example)."
    );
  }
  await signInWithRedirect(a, buildProvider());
  throw new Error("Redirecting to Google…");
}

/** Call on page load: completes a redirect sign-in and returns its ID token, or null. */
export async function consumeGoogleRedirect(): Promise<string | null> {
  const a = getClientAuth();
  if (!a) return null;
  let result;
  try {
    result = await getRedirectResult(a);
  } catch (err: any) {
    // A real failure (network, misconfiguration) — surface it instead of
    // silently stranding the user on the login page.
    throw new Error(friendlyGoogleError(err));
  }
  if (!result?.user) return null;
  const token = await result.user.getIdToken(true);
  storeGoogleCredential({ idToken: token, refreshToken: result.user.refreshToken });
  return token;
}
