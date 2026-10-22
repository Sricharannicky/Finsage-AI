import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeResetToken } from "@/lib/password-reset";
import { verifyOtp } from "@/lib/otp";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  token: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().min(6).max(6).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { token, email, otp, password } = parsed.data;

    let targetUserId: string | null = null;

    if (email && otp) {
      // Direct 6-digit OTP reset flow
      const otpCheck = verifyOtp(email, otp, true);
      if (!otpCheck.valid) {
        return NextResponse.json(
          { error: otpCheck.error || "Invalid or expired verification code." },
          { status: 400 }
        );
      }
      const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        return NextResponse.json({ error: "User account not found." }, { status: 404 });
      }
      targetUserId = user.id;
    } else if (token) {
      // Traditional link-based token reset flow
      targetUserId = await consumeResetToken(token);
      if (!targetUserId) {
        return NextResponse.json(
          { error: "This reset link is invalid or has expired. Please request a new code." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Please provide either your verification code (OTP) or reset link." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        currency: true,
        monthlyIncomeGoal: true,
        savingsTarget: true,
        createdAt: true,
      },
    });

    // Auto-create session so user is logged in immediately
    const sessionToken = await createSession({
      userId: updatedUser.id,
      email: updatedUser.email,
    });
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully!",
      user: updatedUser,
      token: sessionToken,
    });
  } catch (err: any) {
    console.error("Reset-password error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
