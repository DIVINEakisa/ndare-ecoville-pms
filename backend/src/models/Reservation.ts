import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const reservationSchema = new Schema(
  {
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    source: { type: String, enum: ['Direct', 'Lodgify', 'Phone', 'Walk-in'], default: 'Direct' },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'No Show'],
      default: 'Pending',
      index: true
    },
    checkIn: { type: Date, required: true, index: true },
    checkOut: { type: Date, required: true, index: true },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

reservationSchema.index({ propertyId: 1, roomId: 1, checkIn: 1, checkOut: 1 });
reservationSchema.index({ propertyId: 1, status: 1, checkIn: 1 });

export const Reservation = model('Reservation', reservationSchema);
