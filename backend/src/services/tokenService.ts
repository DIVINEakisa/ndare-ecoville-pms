import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function refreshExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

export function signAccessToken(user: { _id: unknown; email: string; role: string }) {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, options);
}

export async function issueRefreshToken(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string; familyId?: string } = {}
) {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = sha256(rawToken);
  const familyId = meta.familyId ?? crypto.randomUUID();

  await RefreshToken.create({
    userId,
    tokenHash,
    familyId,
    expiresAt: refreshExpiry(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string, meta: { ipAddress?: string; userAgent?: string }) {
  const tokenHash = sha256(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    if (existing?.familyId) {
      await RefreshToken.updateMany({ familyId: existing.familyId }, { revokedAt: new Date() });
    }
    throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  const nextToken = await issueRefreshToken(String(existing.userId), {
    ...meta,
    familyId: existing.familyId
  });

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = sha256(nextToken);
  await existing.save();

  return { userId: String(existing.userId), refreshToken: nextToken };
}

export async function revokeRefreshToken(rawToken: string) {
  await RefreshToken.updateOne({ tokenHash: sha256(rawToken) }, { revokedAt: new Date() });
}
