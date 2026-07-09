import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const settingSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    scope: { type: String, enum: ['Property'], default: 'Property', index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, trim: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

settingSchema.index({ propertyId: 1, key: 1 }, { unique: true });

export const Setting = model('Setting', settingSchema);
