import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createResetToken } from "@/lib/password-reset";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

const schema = z.object({ email: z.string().email("Invalid email") });

function getAppUrl(req: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
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
