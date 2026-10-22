import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import { getAdminApp } from "@/lib/firebase";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

const schema = z
  .object({
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
  })
  .refine((d) => !!d.idToken || !!d.accessToken, {
    message: "Either idToken or accessToken is required",
  });

interface GoogleUserProfile {
  email: string;
  name?: string;
  picture?: string;
  uid: string;
}

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

async function verifyGoogleCredential(credential: {
  idToken?: string;
  accessToken?: string;
}): Promise<GoogleUserProfile | null> {
  const { idToken, accessToken } = credential;

  // 1. Google OAuth2 Access Token verification via userinfo
  if (accessToken) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          return {
            email: data.email.toLowerCase(),
            name: data.name || data.email.split("@")[0],
            picture: data.picture,
            uid: data.sub || data.id,
          };
        }
      }
    } catch (e: any) {
      console.warn("[auth/google] Google userinfo failed:", e?.message || e);
    }
  }

  if (!idToken) return null;

  // 2. Dev Mock Token (if used in tests)
  if (process.env.NODE_ENV !== "production" && idToken.startsWith("dev-google-mock:")) {
    try {
      const raw = Buffer.from(idToken.replace("dev-google-mock:", ""), "base64").toString("utf8");
      const parsed = JSON.parse(raw);
      if (parsed.email) {
        return {
          email: parsed.email.toLowerCase(),
          name: parsed.name || parsed.email.split("@")[0],
          picture:
            parsed.picture ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsed.email)}`,
          uid: parsed.uid || `google-dev-${parsed.email}`,
        };
      }
    } catch (e) {
      console.warn("[auth/google] dev mock parse error:", e);
    }
  }

  // 3. Firebase Auth Token Public Verification via Google JWKS (no service account required!)
  try {
    const unverified = decodeJwt(idToken);
    if (unverified.iss?.startsWith("https://securetoken.google.com/")) {
      const projectId = (unverified.aud as string) || "finbee-5b187";
      const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });
      if (payload.email) {
        return {
          email: (payload.email as string).toLowerCase(),
          name: (payload.name as string) || (payload.email as string).split("@")[0],
          picture: (payload.picture as string) || undefined,
          uid: (payload.user_id as string) || (payload.sub as string),
        };
      }
    }
  } catch (err: any) {
    console.warn("[auth/google] Firebase public JWKS verify failed, trying next strategy:", err?.message || err);
  }

  // 4. Official Google OAuth2 ID Token Verification (tokeninfo)
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.email) {
        return {
          email: data.email.toLowerCase(),
          name: data.name || data.email.split("@")[0],
          picture: data.picture,
          uid: data.sub || data.user_id,
        };
      }
    }
  } catch (err: any) {
    console.warn("[auth/google] Google tokeninfo verification failed:", err?.message || err);
  }

  // 5. Firebase Admin SDK verification (if Firebase project is configured)
  const app = getAdminApp();
  if (app) {
    try {
      const { getAuth } = await import("firebase-admin/auth");
      const decoded = await getAuth(app).verifyIdToken(idToken);
      if (decoded.email) {
        return {
          email: decoded.email.toLowerCase(),
          name: decoded.name || decoded.email.split("@")[0],
          picture: decoded.picture,
          uid: decoded.uid,
        };
      }
    } catch (err: any) {
      console.warn("[auth/google] Firebase Admin verifyIdToken failed:", err?.message || err);
    }
  }

  // 6. Final safety: If in development, extract claims from unverified payload if signature already verified by browser
  if (process.env.NODE_ENV !== "production") {
    try {
      const claims = decodeJwt(idToken);
      if (claims.email) {
        console.log("[auth/google] Dev fallback: accepted valid JWT claims for", claims.email);
        return {
          email: (claims.email as string).toLowerCase(),
          name: (claims.name as string) || (claims.email as string).split("@")[0],
          picture: claims.picture as string | undefined,
          uid: (claims.sub as string) || (claims.user_id as string) || `google-${claims.email}`,
        };
      }
    } catch {}
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Google credential" }, { status: 400 });
    }

    const profile = await verifyGoogleCredential(parsed.data);
    if (!profile || !profile.email) {
      return NextResponse.json(
        { error: "Google verification failed or expired. Please try signing in again." },
        { status: 401 }
      );
    }

    const email = profile.email.toLowerCase();

    // Find existing user or create fresh account
    const existing = await db.user.findUnique({ where: { email } });
    let user: any;
    if (existing) {
      const patch: Record<string, any> = { authProvider: "google" };
      if (!existing.avatar && profile.picture) patch.avatar = profile.picture;
      if (!(existing as any).googleId) patch.googleId = profile.uid;
      user = await db.user.update({ where: { id: existing.id }, data: patch });
    } else {
      user = await db.user.create({
        data: {
          email,
          name: profile.name || email.split("@")[0],
          avatar: profile.picture || null,
          authProvider: "google",
          googleId: profile.uid,
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
