import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

emailTemplateSchema.index({ propertyId: 1, key: 1 }, { unique: true });

export const EmailTemplate = model('EmailTemplate', emailTemplateSchema);
