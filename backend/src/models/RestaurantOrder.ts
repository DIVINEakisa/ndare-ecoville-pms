import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const restaurantOrderSchema = new Schema(
  {
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    folioId: { type: Schema.Types.ObjectId, ref: 'Folio', index: true },
    orderNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Received',
      index: true
    },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
      }
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

restaurantOrderSchema.index({ propertyId: 1, status: 1, createdAt: 1 });
restaurantOrderSchema.index({ propertyId: 1, orderNumber: 1 }, { unique: true });

export const RestaurantOrder = model('RestaurantOrder', restaurantOrderSchema);
