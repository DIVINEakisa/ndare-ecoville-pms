import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const inventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Kitchen', 'Room Supplies', 'Cleaning', 'Utilities'], required: true, index: true },
    unit: { type: String, required: true, trim: true },
    quantityOnHand: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 0, min: 0 },
    supplier: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

inventoryItemSchema.index({ propertyId: 1, category: 1 });
inventoryItemSchema.index({ propertyId: 1, quantityOnHand: 1, lowStockThreshold: 1 });

export const InventoryItem = model('InventoryItem', inventoryItemSchema);
