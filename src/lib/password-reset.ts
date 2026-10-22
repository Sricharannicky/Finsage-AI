// Server-only password-reset token store (Firestore collection `passwordResets` or in-memory local fallback)
// Doc id = sha256(token). Never stores the raw token.
import crypto from "crypto";
import { getFirestore, isFirebaseConfigured } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "passwordResets";
const TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory fallback for local development when Firebase is not configured
const localResetTokens = new Map<string, { userId: string; expires: Date }>();

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const id = hashResetToken(token);
  const expires = new Date(Date.now() + TTL_MS);

  if (isFirebaseConfigured()) {
    const fs = getFirestore();
    if (fs) {
      await fs.collection(COLLECTION).doc(id).set({
        userId,
        expires: Timestamp.fromDate(expires),
        createdAt: Timestamp.now(),
      });
      return token;
    }
  }

  localResetTokens.set(id, { userId, expires });
  return token;
}

/** Validates token, returns userId and single-uses (deletes) the token. */
export async function consumeResetToken(token: string): Promise<string | null> {
  const id = hashResetToken(token);

  if (isFirebaseConfigured()) {
    const fs = getFirestore();
    if (fs) {
      const snap = await fs.collection(COLLECTION).doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      const expires = data.expires?.toDate?.() ?? new Date(0);
      await snap.ref.delete(); // single-use regardless of outcome
      if (expires.getTime() < Date.now()) return null;
      return (data.userId as string) || null;
    }
  }

  const record = localResetTokens.get(id);
  if (!record) return null;
  localResetTokens.delete(id);
  if (record.expires.getTime() < Date.now()) return null;
  return record.userId;
}
