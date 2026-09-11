import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApp } from "@/lib/firebase";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

const schema = z.object({ idToken: z.string().min(10, "Invalid Google credential") });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Google credential" }, { status: 400 });
    }

    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        { error: "Google login is unavailable right now. Please try again later." },
        { status: 500 }
      );
    }

    let decoded: { email?: string; name?: string; picture?: string; uid: string };
    try {
      decoded = await getAuth(app).verifyIdToken(parsed.data.idToken);
    } catch {
      return NextResponse.json({ error: "Google sign-in expired. Please try again." }, { status: 401 });
    }

    const email = decoded.email?.toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Your Google account has no email address. Use email sign-in instead." },
        { status: 400 }
      );
    }

    // Merge with existing password account on same email, else create fresh.
    const existing = await db.user.findUnique({ where: { email } });
    let user: any;
    if (existing) {
      const patch: Record<string, any> = { authProvider: "google" };
      if (!existing.avatar && decoded.picture) patch.avatar = decoded.picture;
      if (!(existing as any).googleId) patch.googleId = decoded.uid;
      user = await db.user.update({ where: { id: existing.id }, data: patch });
    } else {
      user = await db.user.create({
        data: {
          email,
          name: decoded.name || email.split("@")[0],
          avatar: decoded.picture || null,
          authProvider: "google",
          googleId: decoded.uid,
        },
      });
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
    console.error("Google login error:", err);
    return NextResponse.json({ error: "Google sign-in failed. Please try again." }, { status: 500 });
  }
}
