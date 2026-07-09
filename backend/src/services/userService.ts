import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Property } from '../models/Property.js';
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

  const existing = await User.exists({ email: input.email.toLowerCase(), deletedAt: null });
  if (existing) throw new AppError(409, 'A user with this email already exists', 'USER_EXISTS');

  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const user = await User.create({
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    passwordHash: await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS),
    role: input.role,
    assignedPropertyIds: [input.propertyId],
    activePropertyId: input.propertyId,
    isActive: true,
    createdBy: input.createdBy
  });

  // Generate an activation token (reuses the password-reset flow) valid for 72 hours
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

  return { user: populated, invitationUrl };
}
