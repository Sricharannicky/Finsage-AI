import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAndSendOtp } from "@/lib/otp";

const schema = z.object({ email: z.string().email("Invalid email") });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, a verification code has been sent.",
        emailConfigured: false,
      });
    }

    const result = await createAndSendOtp(email, user.name);

    return NextResponse.json({
      success: true,
      message: result.message,
      emailSent: result.emailSent,
      emailConfigured: result.emailConfigured,
      debugOtp: result.debugOtp,
    });
  } catch (err: any) {
    console.error("Forgot-password error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
