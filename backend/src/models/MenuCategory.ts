import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const menuCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

menuCategorySchema.index({ propertyId: 1, name: 1 }, { unique: true });
menuCategorySchema.index({ propertyId: 1, displayOrder: 1 });

export const MenuCategory = model('MenuCategory', menuCategorySchema);
