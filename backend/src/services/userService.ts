import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Property } from '../models/Property.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import type { UserRole } from '../types/roles.js';
import { AppError } from '../utils/AppError.js';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function listUsers() {
  return User.find({ deletedAt: null })
    .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt')
    .populate('assignedPropertyIds', 'name code')
    .populate('activePropertyId', 'name code')
    .sort({ createdAt: -1 })
    .lean();
}

export async function createStaffUser(input: {
  fullName: string;
  email: string;
  role: UserRole;
  propertyId: string;
  createdBy?: string;
}) {
  const property = await Property.exists({ _id: input.propertyId, deletedAt: null, isActive: true });
  if (!property) throw new AppError(404, 'Property not found', 'PROPERTY_NOT_FOUND');

  const email = input.email.toLowerCase();

  // Check if this email already exists
  const existingUser = await User.findOne({ email, deletedAt: null });

  if (existingUser) {
    if (existingUser.isActive) {
      // Genuinely active account — hard conflict, reject
      throw new AppError(409, 'An active user with this email already exists', 'USER_EXISTS');
    }

    // Deactivated account — reactivate it with fresh credentials and a new invitation
    const rawToken = crypto.randomBytes(48).toString('hex');

    await User.updateOne(
      { _id: existingUser._id },
      {
        fullName: input.fullName,
        role: input.role,
        assignedPropertyIds: [input.propertyId],
        activePropertyId: input.propertyId,
        isActive: true,
        passwordHash: await bcrypt.hash(crypto.randomBytes(9).toString('base64url'), env.BCRYPT_ROUNDS),
        updatedBy: input.createdBy
      }
    );

    // Replace any stale tokens with a fresh activation token
    await PasswordResetToken.deleteMany({ userId: existingUser._id });
    await PasswordResetToken.create({
      userId: existingUser._id,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72)
    });

    const invitationUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

    const populated = await User.findById(existingUser._id)
      .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt')
      .populate('assignedPropertyIds', 'name code')
      .populate('activePropertyId', 'name code')
      .lean();

    return { user: populated, invitationUrl, reactivated: true };
  }

  // Brand new user — create from scratch
  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const user = await User.create({
    fullName: input.fullName,
    email,
    passwordHash: await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS),
    role: input.role,
    assignedPropertyIds: [input.propertyId],
    activePropertyId: input.propertyId,
    isActive: true,
    createdBy: input.createdBy
  });

  const rawToken = crypto.randomBytes(48).toString('hex');
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72)
  });

  const invitationUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const populated = await User.findById(user._id)
    .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt')
    .populate('assignedPropertyIds', 'name code')
    .populate('activePropertyId', 'name code')
    .lean();

  return { user: populated, invitationUrl, reactivated: false };
}

export async function deleteStaffUser(targetId: string, requesterId: string) {
  if (targetId === requesterId) {
    throw new AppError(400, 'You cannot delete your own account', 'SELF_DELETE');
  }

  const user = await User.findOne({ _id: targetId, deletedAt: null });
  if (!user) throw new AppError(404, 'Staff member not found', 'USER_NOT_FOUND');

  // Revoke all active sessions before deleting
  await RefreshToken.updateMany(
    { userId: targetId, revokedAt: null },
    { revokedAt: new Date() }
  );
  await PasswordResetToken.deleteMany({ userId: targetId });

  // Soft-delete — preserves history/audit trail
  await User.updateOne(
    { _id: targetId },
    { deletedAt: new Date(), isActive: false, updatedBy: requesterId }
  );

  return { id: targetId, fullName: user.fullName, email: user.email };
}

export async function toggleUserStatus(targetId: string, requesterId: string) {
  // Prevent self-toggle — owners must not lock themselves out
  if (targetId === requesterId) {
    throw new AppError(400, 'You cannot change the status of your own account', 'SELF_STATUS_CHANGE');
  }

  const user = await User.findOne({ _id: targetId, deletedAt: null });
  if (!user) throw new AppError(404, 'Staff member not found', 'USER_NOT_FOUND');

  const nextStatus = !user.isActive;

  await User.updateOne(
    { _id: targetId },
    { isActive: nextStatus, updatedBy: requesterId }
  );

  if (!nextStatus) {
    // Deactivating — revoke all active sessions immediately
    await RefreshToken.updateMany(
      { userId: targetId, revokedAt: null },
      { revokedAt: new Date() }
    );
    // Invalidate any pending activation / password-reset tokens
    await PasswordResetToken.deleteMany({ userId: targetId });
  }

  return {
    id: targetId,
    fullName: user.fullName,
    email: user.email,
    isActive: nextStatus
  };
}
