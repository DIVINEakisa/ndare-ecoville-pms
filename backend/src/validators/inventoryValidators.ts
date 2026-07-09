import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listInventorySchema = z.object({
  query: paginationQuery.extend({
    category: z.enum(['Kitchen', 'Room Supplies', 'Cleaning', 'Utilities']).optional(),
    lowStock: z.coerce.boolean().optional()
  })
});

export const createInventoryItemSchema = z.object({
  body: z.object({
    propertyId: objectId,
    name: z.string().min(2).max(120),
    category: z.enum(['Kitchen', 'Room Supplies', 'Cleaning', 'Utilities']),
    unit: z.string().min(1).max(40),
    quantityOnHand: z.coerce.number().min(0).default(0),
    lowStockThreshold: z.coerce.number().min(0).default(0),
    supplier: z.string().max(120).optional()
  })
});

export const stockMovementSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    type: z.enum(['Purchase', 'Issue', 'Adjustment']),
    quantity: z.coerce.number(),
    notes: z.string().max(500).optional()
  })
});
