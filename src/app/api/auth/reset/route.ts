import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeResetToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(10, "Invalid reset link"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = await consumeResetToken(parsed.data.token);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });

    return NextResponse.json({ success: true, message: "Password updated. You can sign in now." });
  } catch (err: any) {
    console.error("Reset-password error:", err);
    const msg =
      err?.message === "Firebase is not configured."
        ? "Password reset is unavailable right now. Please try again later."
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
