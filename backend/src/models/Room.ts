import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const roomSchema = new Schema(
  {
    roomNumber: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    type: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    baseRate: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Reserved', 'Maintenance', 'Inactive'],
      default: 'Available',
      index: true
    },
    amenities: [{ type: String, trim: true }],
    ...propertyOwnedFields
  },
  { timestamps: true }
);

roomSchema.index({ propertyId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ propertyId: 1, status: 1 });

export const Room = model('Room', roomSchema);
