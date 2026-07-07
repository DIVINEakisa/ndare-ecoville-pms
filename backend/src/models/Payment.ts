import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const paymentSchema = new Schema(
  {
    folioId: { type: Schema.Types.ObjectId, ref: 'Folio', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['Cash', 'Card', 'MTN Mobile Money', 'Airtel Money'], required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Refunded'], default: 'Completed' },
    paidAt: { type: Date, default: Date.now, index: true },
    reference: String,
    ...propertyOwnedFields
  },
  { timestamps: true }
);

paymentSchema.index({ propertyId: 1, paidAt: -1 });
paymentSchema.index({ propertyId: 1, method: 1 });

export const Payment = model('Payment', paymentSchema);
