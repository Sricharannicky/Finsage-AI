import crypto from "crypto";
import { isEmailConfigured, sendEmail, otpEmailHtml } from "./email";

interface OtpEntry {
  email: string;
  otpHash: string;
  expires: Date;
  attempts: number;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// In-memory OTP storage
const otpStore = new Map<string, OtpEntry>();

function hashOtp(email: string, otp: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${otp.trim()}`)
    .digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Creates, stores, and sends an OTP for the given email address.
 * If email is not configured (or in dev), logs to console and returns debugOtp.
 */
export async function createAndSendOtp(
  email: string,
  name?: string
): Promise<{
  success: boolean;
  message: string;
  emailSent: boolean;
  emailConfigured: boolean;
  debugOtp?: string;
}> {
  const normEmail = normalizeEmail(email);
  const otp = generateOtp();
  const otpHash = hashOtp(normEmail, otp);
  const expires = new Date(Date.now() + OTP_TTL_MS);

  // Store in memory
  otpStore.set(normEmail, {
    email: normEmail,
    otpHash,
    expires,
    attempts: 0,
  });

  const configured = isEmailConfigured();
  let emailSent = false;

  // Pretty terminal logging so local testing is effortless
  console.log("\n============================================================");
  console.log(`🔑 [FINSAGE OTP] Code for: ${normEmail}`);
  console.log(`👉 OTP CODE: ${otp}`);
  console.log(`⏳ Valid for 10 minutes (expires ${expires.toLocaleTimeString()})`);
  console.log(`📧 Email service: ${configured ? "Configured" : "NOT configured (using local dev mode)"}`);
  console.log("============================================================\n");

  if (configured) {
    try {
      const result = await sendEmail({
        to: normEmail,
        subject: `Your FinSage verification code: ${otp}`,
        html: otpEmailHtml(otp, name),
      });
      emailSent = result.sent;
      if (!emailSent) {
        console.warn("[otp] Email sending failed:", result.reason);
      }
    } catch (err: any) {
      console.error("[otp] Email send error:", err?.message || err);
    }
  }

  // Provide debugOtp if email is not configured or in dev mode so the user is never stuck
  const shouldExposeDebug = !emailSent || process.env.NODE_ENV !== "production";

  return {
    success: true,
    message: emailSent
      ? `Verification code sent to ${normEmail}`
      : `Verification code generated for ${normEmail}`,
    emailSent,
    emailConfigured: configured,
    debugOtp: shouldExposeDebug ? otp : undefined,
  };
}

/**
 * Verifies the OTP. If valid, deletes the OTP record to prevent replay attacks.
 */
export function verifyOtp(
  email: string,
  inputOtp: string,
  consume: boolean = true
): { valid: boolean; error?: string } {
  const normEmail = normalizeEmail(email);
  const entry = otpStore.get(normEmail);

  if (!entry) {
    return {
      valid: false,
      error: "No active verification code found. Please request a new one.",
    };
  }

  if (entry.expires.getTime() < Date.now()) {
    otpStore.delete(normEmail);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normEmail);
    return {
      valid: false,
      error: "Too many failed attempts. Please request a new code.",
    };
  }

  const expectedHash = entry.otpHash;
  const providedHash = hashOtp(normEmail, inputOtp);

  if (expectedHash !== providedHash) {
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return {
      valid: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many failed attempts. Please request a new code.",
    };
  }

  if (consume) {
    otpStore.delete(normEmail);
  }

  return { valid: true };
}
