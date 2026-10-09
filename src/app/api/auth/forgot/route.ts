import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createResetToken } from "@/lib/password-reset";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

const schema = z.object({ email: z.string().email("Invalid email") });

function getAppUrl(req: NextRequest): string {
  const reqProto = req.headers.get("x-forwarded-proto") || "http";
  const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const configured = process.env.APP_URL?.replace(/\/$/, "");

  // Prefer the live request host: it is authoritative for where the link
  // will be opened. This keeps reset links correct even when APP_URL is
  // stale/misconfigured (e.g. an outdated Vercel env var).
  if (reqHost) {
    try {
      const configuredHost = configured ? new URL(configured).host : null;
      if (!configured || configuredHost === reqHost) {
        return configured ?? `${reqProto}://${reqHost}`;
      }
    } catch {
      // malformed APP_URL → fall through to request host
    }
    return `${reqProto}://${reqHost}`;
  }
  return configured || "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();

    // Always respond success — never reveal whether the email exists.
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      try {
        const token = await createResetToken(user.id);
        const resetUrl = `${getAppUrl(req)}/reset-password?token=${token}`;
        const { sent, reason } = await sendEmail({
          to: email,
          subject: "Reset your FinSage password",
          html: passwordResetEmailHtml(resetUrl, (user as any).name),
        });
        if (!sent) console.warn("[forgot] email not sent:", reason);
      } catch (err: any) {
        console.error("[forgot] token/email error:", err?.message || err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, a reset link is on its way.",
    });
  } catch (err: any) {
    console.error("Forgot-password error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
