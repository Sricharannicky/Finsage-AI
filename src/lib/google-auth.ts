// Google Authentication Client Utility
// Supports:
// 1. Google Identity Services (GIS) OAuth2 popup via NEXT_PUBLIC_GOOGLE_CLIENT_ID
// 2. Firebase Google popup fallback via NEXT_PUBLIC_FIREBASE_*
// 3. Simulated dev token for instant local offline testing

declare global {
  interface Window {
    google?: any;
  }
}

export function getGoogleClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

export function isGoogleAuthLive(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
  );
}

let gsiScriptLoadingPromise: Promise<void> | null = null;

export function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  if (gsiScriptLoadingPromise) return gsiScriptLoadingPromise;

  gsiScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-gsi-client");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });

  return gsiScriptLoadingPromise;
}

/** Initiates Google Identity Services (GIS) OAuth popup */
export async function signInWithGIS(): Promise<{ accessToken: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env");
  }

  await loadGsiScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services failed to initialize.");
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: (response: any) => {
          if (response?.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response?.access_token) {
            resolve({ accessToken: response.access_token });
          } else {
            reject(new Error("No access token returned from Google."));
          }
        },
      });

      client.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      reject(err);
    }
  });
}

/** Generates local development test token for 1-click Google login without cloud setup */
export function createDevGoogleToken(email: string, name?: string): string {
  const payload = {
    email: email.trim().toLowerCase(),
    name: name?.trim() || email.split("@")[0],
    picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
    uid: `google-dev-${Date.now()}`,
  };
  return `dev-google-mock:${btoa(JSON.stringify(payload))}`;
}
