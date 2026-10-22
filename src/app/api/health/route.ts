import { NextResponse } from "next/server";
import { getFirestore, isFirebaseConfigured, getAdminDiagnostics } from "@/lib/firebase";
import { prisma } from "@/lib/prisma";
import { isLocalDatabase } from "@/lib/db";

// Read-only connectivity probe for the database.
type Reason =
  | "ok"
  | "unconfigured"
  | "init-failed"
  | "permission-denied"
  | "invalid-credential"
  | "not-found"
  | "unavailable"
  | "unknown";

function categorizeFirestoreError(err: any): Exclude<Reason, "ok" | "unconfigured" | "init-failed"> {
  const code = err?.code;
  if (code === 7 || code === "permission-denied" || code === "PERMISSION_DENIED")
    return "permission-denied";
  if (code === 16 || code === "unauthenticated" || code === "UNAUTHENTICATED")
    return "invalid-credential";
  if (code === 5 || code === "not-found" || code === "NOT_FOUND") return "not-found";
  if (code === 14 || code === "unavailable" || code === "UNAVAILABLE") return "unavailable";
  if (code === 3 || code === "invalid-argument" || code === "INVALID_ARGUMENT")
    return "invalid-credential";
  return "unknown";
}

export async function GET() {
  const localMode = isLocalDatabase();

  if (localMode) {
    try {
      await prisma.user.count();
      return NextResponse.json({
        ok: true,
        database: "sqlite (prisma)",
        mode: "local",
        firebase: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          ok: false,
          database: "sqlite (prisma)",
          mode: "local",
          error: err?.message || String(err),
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  }

  const diag = getAdminDiagnostics();
  let firestore: "ok" | "error" | "unconfigured" = diag.configured ? "error" : "unconfigured";
  let reason: Reason = diag.configured ? "unknown" : "unconfigured";

  if (diag.configured) {
    const fs = getFirestore();
    if (!fs) {
      reason = "init-failed";
    } else {
      try {
        await fs.collection("users").limit(1).get();
        firestore = "ok";
        reason = "ok";
      } catch (err: any) {
        reason = categorizeFirestoreError(err);
      }
    }
  }

  const ok = diag.configured && firestore === "ok";
  return NextResponse.json(
    {
      ok,
      database: "firestore",
      mode: "cloud",
      firebase: diag.configured,
      firestore,
      reason,
      projectMatch: diag.projectMatch,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
