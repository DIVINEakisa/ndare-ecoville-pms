import { Schema, model, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model('RefreshToken', refreshTokenSchema);
