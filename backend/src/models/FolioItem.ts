import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const folioItemSchema = new Schema(
  {
    folioId: { type: Schema.Types.ObjectId, ref: 'Folio', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
    source: { type: String, enum: ['Room', 'Restaurant', 'Service', 'Adjustment'], required: true, index: true },
    sourceId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    postedAt: { type: Date, default: Date.now, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

folioItemSchema.index({ propertyId: 1, folioId: 1, postedAt: -1 });

export const FolioItem = model('FolioItem', folioItemSchema);
