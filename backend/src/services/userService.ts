import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Property } from '../models/Property.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import type { UserRole } from '../types/roles.js';
import { AppError } from '../utils/AppError.js';

export async function listUsers() {
  return User.find({ deletedAt: null })
    .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt plainPassword')
    .populate('assignedPropertyIds', 'name code')
    .populate('activePropertyId', 'name code')
    .sort({ createdAt: -1 })
    .lean();
}

export async function createStaffUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  propertyId: string;
  createdBy?: string;
}) {
  const property = await Property.exists({ _id: input.propertyId, deletedAt: null, isActive: true });
  if (!property) throw new AppError(404, 'Property not found', 'PROPERTY_NOT_FOUND');

  const email = input.email.toLowerCase();

  const existingUser = await User.findOne({ email, deletedAt: null });

  if (existingUser) {
    if (existingUser.isActive) {
      throw new AppError(409, 'An active user with this email already exists', 'USER_EXISTS');
    }

    // Deactivated account — reactivate with the new password the owner provided
    await User.updateOne(
      { _id: existingUser._id },
      {
        fullName:            input.fullName,
        role:                input.role,
        assignedPropertyIds: [input.propertyId],
        activePropertyId:    input.propertyId,
        isActive:            true,
        passwordHash:        await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
        plainPassword:       input.password,
        updatedBy:           input.createdBy
      }
    );

    const populated = await User.findById(existingUser._id)
      .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt')
      .populate('assignedPropertyIds', 'name code')
      .populate('activePropertyId', 'name code')
      .lean();

    return { user: populated, reactivated: true };
  }

  // Brand new user
  const user = await User.create({
    fullName:            input.fullName,
    email,
    passwordHash:        await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
    plainPassword:       input.password,
    role:                input.role,
    assignedPropertyIds: [input.propertyId],
    activePropertyId:    input.propertyId,
    isActive:            true,
    createdBy:           input.createdBy
  });

  const populated = await User.findById(user._id)
    .select('fullName email role assignedPropertyIds activePropertyId isActive createdAt')
    .populate('assignedPropertyIds', 'name code')
    .populate('activePropertyId', 'name code')
    .lean();

  return { user: populated, reactivated: false };
}

export async function resetStaffPassword(targetId: string, requesterId: string, newPassword: string) {
  if (targetId === requesterId) {
    throw new AppError(400, 'Use the profile page to change your own password', 'SELF_PASSWORD_RESET');
  }

  const user = await User.findOne({ _id: targetId, deletedAt: null });
  if (!user) throw new AppError(404, 'Staff member not found', 'USER_NOT_FOUND');

  await User.updateOne(
    { _id: targetId },
    { passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS), plainPassword: newPassword, updatedBy: requesterId }
  );

  // Revoke all active sessions so the new password takes effect immediately
  await RefreshToken.updateMany(
    { userId: targetId, revokedAt: null },
    { revokedAt: new Date() }
  );

  return { id: targetId, fullName: user.fullName, email: user.email };
}

export async function deleteStaffUser(targetId: string, requesterId: string) {
  if (targetId === requesterId) {
    throw new AppError(400, 'You cannot delete your own account', 'SELF_DELETE');
  }

  const user = await User.findOne({ _id: targetId, deletedAt: null });
  if (!user) throw new AppError(404, 'Staff member not found', 'USER_NOT_FOUND');

  await RefreshToken.updateMany(
    { userId: targetId, revokedAt: null },
    { revokedAt: new Date() }
  );
  await PasswordResetToken.deleteMany({ userId: targetId });

  await User.updateOne(
    { _id: targetId },
    { deletedAt: new Date(), isActive: false, updatedBy: requesterId }
  );

  return { id: targetId, fullName: user.fullName, email: user.email };
}

export async function toggleUserStatus(targetId: string, requesterId: string) {
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
    await RefreshToken.updateMany(
      { userId: targetId, revokedAt: null },
      { revokedAt: new Date() }
    );
    await PasswordResetToken.deleteMany({ userId: targetId });
  }

  return {
    id:       targetId,
    fullName: user.fullName,
    email:    user.email,
    isActive: nextStatus
  };
}
