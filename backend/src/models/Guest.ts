import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const guestSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    nationality: { type: String, trim: true },
    documentType: { type: String, enum: ['Passport', 'National ID', 'Driver License', 'Other'] },
    documentNumber: { type: String, trim: true },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    signatureUrl: String,
    ...propertyOwnedFields
  },
  { timestamps: true }
);

guestSchema.index({ propertyId: 1, fullName: 1 });
guestSchema.index({ propertyId: 1, email: 1 });
guestSchema.index({ propertyId: 1, phone: 1 });

export const Guest = model('Guest', guestSchema);
