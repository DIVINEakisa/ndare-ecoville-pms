import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Info', 'Success', 'Warning', 'Danger'], default: 'Info', index: true },
    entityType: { type: String, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    readAt: { type: Date, default: null, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

notificationSchema.index({ propertyId: 1, userId: 1, readAt: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
