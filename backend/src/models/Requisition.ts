import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const requisitionSchema = new Schema(
  {
    requestNumber: { type: String, required: true },
    department: { type: String, required: true, trim: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Received'],
      default: 'Pending',
      index: true
    },
    items: [
      {
        inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unit: { type: String, required: true }
      }
    ],
    approval: {
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String
    },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedAt: Date,
    notes: { type: String, trim: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

requisitionSchema.index({ propertyId: 1, requestNumber: 1 }, { unique: true });
requisitionSchema.index({ propertyId: 1, status: 1, createdAt: -1 });

export const Requisition = model('Requisition', requisitionSchema);
