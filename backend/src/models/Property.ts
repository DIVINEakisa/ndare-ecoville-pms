import { Schema, model, type InferSchemaType } from 'mongoose';
import { auditFields } from './baseFields.js';

const propertySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    roomCount: { type: Number, required: true, min: 0 },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    timezone: { type: String, default: 'Africa/Kigali' },
    currency: { type: String, default: 'RWF' },
    isActive: { type: Boolean, default: true, index: true },
    ...auditFields
  },
  { timestamps: true }
);

export type PropertyDocument = InferSchemaType<typeof propertySchema>;
export const Property = model('Property', propertySchema);
