import { Schema, model } from 'mongoose';
import { propertyOwnedFields } from './baseFields.js';

const stockMovementSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    type: { type: String, enum: ['Purchase', 'Issue', 'Adjustment', 'Requisition'], required: true, index: true },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    nextQuantity: { type: Number, required: true },
    referenceType: { type: String, enum: ['Manual', 'Requisition'], default: 'Manual' },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
    ...propertyOwnedFields
  },
  { timestamps: true }
);

stockMovementSchema.index({ propertyId: 1, inventoryItemId: 1, createdAt: -1 });

export const StockMovement = model('StockMovement', stockMovementSchema);
