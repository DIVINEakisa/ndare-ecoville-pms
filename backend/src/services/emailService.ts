import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function mailerReady() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!mailerReady()) {
    console.info(`Password reset email skipped. Reset URL for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    to,
    from: env.SMTP_FROM,
    subject: 'Reset your HMS password',
    text: `Use this secure link to reset your password: ${resetUrl}`,
    html: `<p>Use this secure link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}
