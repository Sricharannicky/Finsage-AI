import { NextResponse } from "next/server";
import { getFirestore, isFirebaseConfigured } from "@/lib/firebase";

// Read-only connectivity probe for the production database.
// No auth required: reveals only booleans, never data or secrets.
// Lets anyone verify Firestore reachability + credentials without guessing:
//   { firebase: true, firestore: "ok" }    → credentials valid, reads working
//   { firebase: true, firestore: "error" } → service-account key invalid/revoked
//   { firebase: false, ... }               → env vars missing
export async function GET() {
  const firebase = isFirebaseConfigured();
  let firestore: "ok" | "error" | "unconfigured" = firebase ? "error" : "unconfigured";
  if (firebase) {
    try {
      const fs = getFirestore();
      // Single-document read: proves connectivity AND IAM permission
      // (a revoked/deleted key surfaces here as PERMISSION_DENIED).
      await fs!.collection("users").limit(1).get();
      firestore = "ok";
    } catch (err: any) {
      console.error("[health] firestore probe failed:", err?.message || err);
    }
  }
  const ok = firebase && firestore === "ok";
  return NextResponse.json(
    { ok, firebase, firestore, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
