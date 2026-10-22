// Email sender — Resend (preferred) with free Gmail SMTP fallback.
// Option A — Resend: RESEND_API_KEY (+ optional EMAIL_FROM). Free 100/day.
// Option B — Gmail SMTP (100% free, no domain needed): SMTP_USER (your Gmail),
//   SMTP_PASS (a Gmail App Password), EMAIL_FROM optional ("FinSage <you@gmail.com>").
import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY || !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailProvider(): "resend" | "smtp" | "none" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return "none";
}

export function getEmailFrom(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.SMTP_USER) return `FinSage <${process.env.SMTP_USER}>`;
  return "FinSage <onboarding@resend.dev>";
}

async function sendViaSmtp(opts: { to: string; subject: string; html: string }): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_PORT || "587") === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: getEmailFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const provider = emailProvider();
  if (provider === "none") {
    console.warn("[email] no provider configured — skipping send to", opts.to);
    return { sent: false, reason: "Email not configured (set RESEND_API_KEY or SMTP_USER/SMTP_PASS)" };
  }

  try {
    if (provider === "smtp") {
      await sendViaSmtp(opts);
      return { sent: true };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend send failed:", res.status, text);
      return { sent: false, reason: `Email provider error (${res.status})` };
    }
    return { sent: true };
  } catch (err: any) {
    console.error("[email] send failed:", err?.message || err);
    return { sent: false, reason: "Email send failed" };
  }
}

export function passwordResetEmailHtml(resetUrl: string, name?: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 8px">Reset your FinSage password</h2>
    <p style="color:#475569">Hi ${name ? escapeHtml(name) : "there"}, click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:24px 0">
      <a href="${resetUrl}" style="background:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600">Set new password</a>
    </p>
    <p style="color:#94a3b8;font-size:13px">Or paste this link in your browser:<br/>${resetUrl}</p>
    <p style="color:#94a3b8;font-size:13px">Didn't ask for this? You can safely ignore this email.</p>
  </div>`;
}

export function otpEmailHtml(otp: string, name?: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:28px 24px;color:#0f172a;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:36px;height:36px;border-radius:10px;background:#10b981;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;text-align:center;line-height:36px">F</div>
      <span style="font-weight:bold;font-size:18px;color:#0f172a">FinSage AI</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Password Reset OTP</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6">Hi ${name ? escapeHtml(name) : "there"}, use the following One-Time Password (OTP) to reset your password. This code expires in <strong>10 minutes</strong>.</p>
    <div style="margin:24px 0;padding:18px;background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;text-align:center">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#059669;padding-left:10px">${otp}</span>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.5">Enter this code on the verification screen to set your new password. If you did not request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px" />
    <p style="color:#94a3b8;font-size:11px;text-align:center">FinSage AI · Personal Budget Planning Agent</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
