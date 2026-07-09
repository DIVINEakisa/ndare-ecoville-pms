import nodemailer from "nodemailer";
import { env } from "../config/env.js";

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

function mailerReady() {
  return transporter !== null;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!mailerReady()) {
    console.info(
      `Password reset email skipped. Reset URL for ${to}: ${resetUrl}`,
    );
    return;
  }

  await transporter!.sendMail({
    to,
    from: env.SMTP_FROM,
    subject: "Reset your HMS password",
    text: `Use this secure link to reset your password: ${resetUrl}`,
    html: `<p>Use this secure link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function sendStaffInvitationEmail(
  to: string,
  invitationUrl: string,
  role: string,
) {
  if (!mailerReady()) {
    console.info(
      `Staff invitation email skipped. Invitation URL for ${to}: ${invitationUrl}`,
    );
    return;
  }

  await transporter!.sendMail({
    to,
    from: env.SMTP_FROM,
    subject: "Setup your NuvraHub HMS Staff Account",
    text: `You have been added as a ${role}. Use this link to set up your password: ${invitationUrl}`,
    html: `
      <h2>Welcome to the Team!</h2>
      <p>You have been added to NuvraHub HMS with the role of <strong>${role}</strong>.</p>
      <p>Please click the secure link below to set up your password and access your workspace:</p>
      <p><a href="${invitationUrl}" style="background-color: #4d7c0f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Up My Account</a></p>
      <small>If the button doesn't work, copy-paste this link: ${invitationUrl}</small>
    `,
  });
}
