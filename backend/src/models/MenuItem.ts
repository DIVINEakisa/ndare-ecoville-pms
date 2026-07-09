import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const menuItemSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    preparationMinutes: { type: Number, default: 20, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

menuItemSchema.index({ propertyId: 1, categoryId: 1, isAvailable: 1 });
menuItemSchema.index({ propertyId: 1, name: 1 });

export const MenuItem = model('MenuItem', menuItemSchema);
