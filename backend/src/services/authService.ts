import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { sendPasswordResetEmail } from './emailService.js';
import { issueRefreshToken, rotateRefreshToken, signAccessToken } from './tokenService.js';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function login(input: { email: string; password: string; ipAddress?: string; userAgent?: string }) {
  const user = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null }).select('+passwordHash');

  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(String(user._id), {
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedPropertyIds: user.assignedPropertyIds,
      activePropertyId: user.activePropertyId
    }
  };
}

export async function refreshSession(input: { refreshToken: string; ipAddress?: string; userAgent?: string }) {
  const rotated = await rotateRefreshToken(input.refreshToken, {
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  const user = await User.findOne({ _id: rotated.userId, isActive: true, deletedAt: null });
  if (!user) throw new AppError(401, 'User session is no longer valid', 'INVALID_SESSION');

  return {
    accessToken: signAccessToken(user),
    refreshToken: rotated.refreshToken,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedPropertyIds: user.assignedPropertyIds,
      activePropertyId: user.activePropertyId
    }
  };
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true, deletedAt: null });
  if (!user) return;

  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    expiresAt
  });

  await sendPasswordResetEmail(user.email, `${env.CLIENT_URL}/reset-password?token=${rawToken}`);
}

export async function resetPassword(input: { token: string; password: string }) {
  const resetToken = await PasswordResetToken.findOne({
    tokenHash: sha256(input.token),
    usedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!resetToken) {
    throw new AppError(400, 'Password reset token is invalid or expired', 'INVALID_RESET_TOKEN');
  }

  await User.updateOne(
    { _id: resetToken.userId },
    { passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS) }
  );
  await RefreshToken.updateMany({ userId: resetToken.userId }, { revokedAt: new Date() });

  resetToken.usedAt = new Date();
  await resetToken.save();
}
