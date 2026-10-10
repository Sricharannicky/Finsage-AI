import { NextResponse } from "next/server";
import { getFirestore, isFirebaseConfigured, getAdminDiagnostics } from "@/lib/firebase";

// Read-only connectivity probe for the production database.
// No auth required. Public output contains ONLY booleans and coarse,
// non-sensitive status enums — never messages, emails, keys, tokens,
// project internals, or user data. Full detail goes to server logs
// (Vercel), which likewise never include credentials.
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
  const diag = getAdminDiagnostics();
  // Safe to log: project IDs are public identifiers; keyShape is
  // booleans/length only. No emails, keys, tokens, or user data.
  console.error(
    "[health] admin diagnostics:",
    JSON.stringify({
      configured: diag.configured,
      projectIdEnv: diag.projectIdEnv,
      emailProject: diag.emailProject,
      projectMatch: diag.projectMatch,
      keyShape: diag.keyShape,
    })
  );

  let firestore: "ok" | "error" | "unconfigured" = diag.configured ? "error" : "unconfigured";
  let reason: Reason = diag.configured ? "unknown" : "unconfigured";

  if (diag.configured) {
    const fs = getFirestore();
    if (!fs) {
      // Credential present but unusable (malformed key, bad quotes, init throw).
      reason = "init-failed";
      console.error("[health] firestore init failed: projectMatch =", diag.projectMatch);
    } else {
      try {
        // Single-document read: proves connectivity AND IAM permission
        // (a revoked/deleted key surfaces here as permission-denied).
        await fs.collection("users").limit(1).get();
        firestore = "ok";
        reason = "ok";
      } catch (err: any) {
        reason = categorizeFirestoreError(err);
        // Server log only: numeric/string code + truncated message.
        // Firestore messages carry resource paths at most — no credentials.
        console.error(
          "[health] firestore probe:",
          `reason=${reason}`,
          `code=${err?.code ?? "n/a"}`,
          `message=${String(err?.message || err).slice(0, 200)}`,
          `projectMatch=${diag.projectMatch}`
        );
      }
    }
  }

  const ok = diag.configured && firestore === "ok";
  return NextResponse.json(
    {
      ok,
      firebase: diag.configured,
      firestore,
      reason,
      projectMatch: diag.projectMatch,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
