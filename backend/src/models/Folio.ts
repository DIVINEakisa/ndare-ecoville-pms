import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const folioSchema = new Schema(
  {
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
    status: { type: String, enum: ['Open', 'Settled', 'Partially Paid', 'Void'], default: 'Open', index: true },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    paidTotal: { type: Number, default: 0 },
    balance: { type: Number, default: 0, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

folioSchema.index({ propertyId: 1, status: 1 });
folioSchema.index({ propertyId: 1, balance: -1 });

export const Folio = model('Folio', folioSchema);
