import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Gmail SMTP transporter — works with any recipient, no domain verification needed.
// Requires SMTP_USER = your Gmail address, SMTP_PASS = Gmail App Password (16 chars)
// Get app password: myaccount.google.com → Security → 2-Step Verification → App Passwords
function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS ? createTransporter() : null;

// Log SMTP config at startup so we can verify it in Render logs
if (transporter) {
  console.info(`[Email] SMTP ready — host: ${env.SMTP_HOST} port: ${env.SMTP_PORT} user: ${env.SMTP_USER}`);
  // Verify the connection immediately on startup
  transporter.verify((error) => {
    if (error) {
      console.error('[Email] SMTP connection FAILED:', error.message);
    } else {
      console.info('[Email] SMTP connection verified — ready to send');
    }
  });
} else {
  console.warn('[Email] SMTP not configured — emails will be skipped');
}

function mailerReady() {
  if (!transporter) {
    console.warn('[Email] SMTP not configured — emails will be skipped');
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!mailerReady()) {
    console.info(`[Email] Skipped password reset for ${to}. URL: ${resetUrl}`);
    return;
  }

  await transporter!.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Reset your Ndare Ecoville PMS password',
    text: `Use this secure link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#3F6212;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">Ndare Ecoville PMS</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
          <h2 style="color:#0f172a;margin-top:0">Reset your password</h2>
          <p style="color:#475569">Click the button below to set a new password.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#4d7c0f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px">This link expires in 30 minutes.</p>
          <p style="color:#cbd5e1;font-size:12px;margin-bottom:0">
            Can't click the button? Copy: <span style="color:#3F6212">${resetUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
  console.info(`[Email] Password reset sent → ${to}`);
}

export async function sendStaffInvitationEmail(
  to: string,
  invitationUrl: string,
  role: string,
) {
  if (!mailerReady()) {
    console.info(`[Email] Skipped invitation for ${to}. URL: ${invitationUrl}`);
    return;
  }

  await transporter!.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'You have been invited to Ndare Ecoville PMS',
    text: `You have been added as ${role}. Set up your account: ${invitationUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#3F6212;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">Ndare Ecoville PMS</h1>
          <p style="color:#d9f99d;margin:6px 0 0;font-size:14px">Staff Account Invitation</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
          <h2 style="color:#0f172a;margin-top:0">Welcome to the team!</h2>
          <p style="color:#475569">
            You have been added to <strong>Ndare Ecoville PMS</strong> as
            <strong style="color:#3F6212">${role}</strong>.
          </p>
          <a href="${invitationUrl}"
             style="display:inline-block;background:#4d7c0f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Set Up My Account
          </a>
          <p style="color:#94a3b8;font-size:13px">This invitation expires in 72 hours.</p>
          <p style="color:#cbd5e1;font-size:12px;margin-bottom:0">
            Can't click the button? Copy: <span style="color:#3F6212">${invitationUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
  console.info(`[Email] Invitation sent → ${to} (${role})`);
}
