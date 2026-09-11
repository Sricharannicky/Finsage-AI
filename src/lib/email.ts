// Email sender via Resend (https://resend.com — free 100 emails/day)
// Env: RESEND_API_KEY (required to actually send), EMAIL_FROM (e.g. "FinSage <onboarding@resend.dev>")

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "FinSage <onboarding@resend.dev>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", opts.to);
    return { sent: false, reason: "Email not configured (RESEND_API_KEY missing)" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
