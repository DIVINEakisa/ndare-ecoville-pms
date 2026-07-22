import bcrypt from "bcrypt";
import crypto from "crypto";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { sendPasswordResetEmail } from "./emailService.js";
import {
  issueRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from "./tokenService.js";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function login(input: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const user = await User.findOne({
    email: input.email.toLowerCase(),
    deletedAt: null,
  }).select("+passwordHash");

  // Distinguish deactivated accounts from wrong credentials so the user
  // gets an actionable message instead of a generic "invalid credentials"
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "This account has been deactivated. Please contact an administrator.",
      "ACCOUNT_DEACTIVATED",
    );
  }

  // Use updateOne so we never risk writing a stale in-memory document back over a
  // freshly-reset passwordHash that was set via a separate updateOne call
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(String(user._id), {
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedPropertyIds: user.assignedPropertyIds.map((id: Types.ObjectId) =>
        String(id),
      ),
      activePropertyId: user.activePropertyId
        ? String(user.activePropertyId)
        : undefined,
    },
  };
}

export async function refreshSession(input: {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const rotated = await rotateRefreshToken(input.refreshToken, {
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const user = await User.findOne({
    _id: rotated.userId,
    isActive: true,
    deletedAt: null,
  });
  if (!user)
    throw new AppError(
      401,
      "User session is no longer valid",
      "INVALID_SESSION",
    );

  return {
    accessToken: signAccessToken(user),
    refreshToken: rotated.refreshToken,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedPropertyIds: user.assignedPropertyIds.map((id: Types.ObjectId) =>
        String(id),
      ),
      activePropertyId: user.activePropertyId
        ? String(user.activePropertyId)
        : undefined,
    },
  };
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({
    email: email.toLowerCase(),
    isActive: true,
    deletedAt: null,
  });
  if (!user) return;

  const rawToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    expiresAt,
  });

  await sendPasswordResetEmail(
    user.email,
    `${env.CLIENT_URL}/reset-password?token=${rawToken}`,
  );
}

export async function resetPassword(input: {
  token: string;
  password: string;
}) {
  const resetToken = await PasswordResetToken.findOne({
    tokenHash: sha256(input.token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw new AppError(
      400,
      "Password reset token is invalid or expired",
      "INVALID_RESET_TOKEN",
    );
  }

  // Hash once and update directly — never load+save the user document to avoid
  // stale in-memory state overwriting this new hash on concurrent requests
  await User.updateOne(
    { _id: resetToken.userId },
    { passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS) },
  );

  // Revoke all active sessions so the new password takes effect immediately
  await RefreshToken.updateMany(
    { userId: resetToken.userId },
    { revokedAt: new Date() },
  );

  // Hard-delete the token so it can never be replayed
  await PasswordResetToken.deleteOne({ _id: resetToken._id });
}
