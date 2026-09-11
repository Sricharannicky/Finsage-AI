// Server-only password-reset token store (Firestore collection `passwordResets`)
// Doc id = sha256(token). Never stores the raw token.
import crypto from "crypto";
import { getFirestore } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "passwordResets";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const fs = getFirestore();
  if (!fs) throw new Error("Firebase is not configured.");
  const token = crypto.randomBytes(32).toString("hex");
  const id = hashResetToken(token);
  await fs.collection(COLLECTION).doc(id).set({
    userId,
    expires: Timestamp.fromDate(new Date(Date.now() + TTL_MS)),
    createdAt: Timestamp.now(),
  });
  return token;
}

/** Validates token, returns userId and single-uses (deletes) the token. */
export async function consumeResetToken(token: string): Promise<string | null> {
  const fs = getFirestore();
  if (!fs) throw new Error("Firebase is not configured.");
  const id = hashResetToken(token);
  const snap = await fs.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const expires = data.expires?.toDate?.() ?? new Date(0);
  await snap.ref.delete(); // single-use regardless of outcome
  if (expires.getTime() < Date.now()) return null;
  return (data.userId as string) || null;
}
