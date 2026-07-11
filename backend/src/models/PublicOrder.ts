import { Schema, model } from 'mongoose';

/**
 * PublicOrder — walk-in / table orders placed via the public QR page.
 * No authentication, no folio, no reservation required.
 * Linked to a property so kitchen staff can filter by location.
 */
const publicOrderSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true
    },
    guestName: {
      type: String,
      required: true,
      trim: true
    },
    locationType: {
      type: String,
      enum: ['room', 'table'],
      required: true
    },
    locationNumber: {
      type: String,
      required: true,
      trim: true
    },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        name:       { type: String, required: true },
        quantity:   { type: Number, required: true, min: 1 },
        unitPrice:  { type: Number, required: true, min: 0 },
        total:      { type: Number, required: true, min: 0 }
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Received',
      index: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

publicOrderSchema.index({ propertyId: 1, status: 1, createdAt: -1 });
publicOrderSchema.index({ propertyId: 1, orderNumber: 1 }, { unique: true });

export const PublicOrder = model('PublicOrder', publicOrderSchema);
