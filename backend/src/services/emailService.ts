import { env } from '../config/env.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

// On Resend's free plan, the only verified sender is onboarding@resend.dev
// and it can ONLY deliver to the account owner's email address.
// For sending to ANY recipient, you must verify a custom domain in Resend.
// Until then, emails will only arrive if the recipient = your Resend account email.
const FROM_ADDRESS = env.SMTP_FROM ?? 'Ndare Ecoville PMS <onboarding@resend.dev>';
const API_KEY      = env.SMTP_PASS; // Resend API key stored in SMTP_PASS

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!API_KEY) {
    console.info(`[Email] SMTP_PASS (Resend API key) not set — skipping email to ${payload.to}`);
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM_ADDRESS,
      to:      [payload.to],
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Resend API error ${response.status}: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  console.info(`[Email] Delivered — id: ${(data as { id?: string }).id} → ${payload.to}`);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: 'Reset your Ndare Ecoville PMS password',
    text:    `Use this secure link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#3F6212;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">Ndare Ecoville PMS</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
          <h2 style="color:#0f172a;margin-top:0">Reset your password</h2>
          <p style="color:#475569">Click the button below to set a new password for your account.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#4d7c0f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px">
            This link expires in 30 minutes.<br>
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color:#cbd5e1;font-size:12px;margin-bottom:0">
            Can't click the button? Copy this link:<br>
            <span style="color:#3F6212">${resetUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendStaffInvitationEmail(
  to: string,
  invitationUrl: string,
  role: string,
) {
  await sendEmail({
    to,
    subject: 'You have been invited to Ndare Ecoville PMS',
    text:    `You have been added as ${role}. Set up your account here: ${invitationUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#3F6212;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">Ndare Ecoville PMS</h1>
          <p style="color:#d9f99d;margin:6px 0 0;font-size:14px">Staff Account Invitation</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
          <h2 style="color:#0f172a;margin-top:0">Welcome to the team!</h2>
          <p style="color:#475569">
            You have been added to <strong>Ndare Ecoville PMS</strong> with the role of
            <strong style="color:#3F6212">${role}</strong>.
          </p>
          <p style="color:#475569">
            Click the button below to set up your password and access your workspace.
          </p>
          <a href="${invitationUrl}"
             style="display:inline-block;background:#4d7c0f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Set Up My Account
          </a>
          <p style="color:#94a3b8;font-size:13px">
            This invitation link expires in 72 hours.
          </p>
          <p style="color:#cbd5e1;font-size:12px;margin-bottom:0">
            Can't click the button? Copy this link:<br>
            <span style="color:#3F6212">${invitationUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
}
