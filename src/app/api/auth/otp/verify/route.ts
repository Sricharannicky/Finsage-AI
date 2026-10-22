import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or OTP format" }, { status: 400 });
    }

    const { email, otp } = parsed.data;
    const result = verifyOtp(email, otp, false); // don't consume yet

    if (!result.valid) {
      return NextResponse.json({ error: result.error || "Invalid verification code" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Code verified successfully",
    });
  } catch (err: any) {
    console.error("[otp/verify] error:", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
