import bcrypt from 'bcrypt';
import { Schema, model, type InferSchemaType } from 'mongoose';
import { env } from '../config/env.js';
import { userRoles } from '../types/roles.js';
import { auditFields } from './baseFields.js';

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    plainPassword: { type: String, select: false },  // visible to Owner only
    role: { type: String, enum: userRoles, required: true, index: true },
    assignedPropertyIds: [{ type: Schema.Types.ObjectId, ref: 'Property', index: true }],
    activePropertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    ...auditFields
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function verifyPassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  verifyPassword(password: string): Promise<boolean>;
};

export const User = model('User', userSchema);
