import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const token = await createSession({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        currency: user.currency,
        monthlyIncomeGoal: user.monthlyIncomeGoal,
        savingsTarget: user.savingsTarget,
      },
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    const errorMsg = err?.message || "An unexpected error occurred";
    return NextResponse.json({ error: `Login failed: ${errorMsg}` }, { status: 500 });
  }
}
