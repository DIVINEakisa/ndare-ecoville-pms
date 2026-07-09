import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listMenuSchema = z.object({
  query: paginationQuery.extend({
    categoryId: objectId.optional(),
    availableOnly: z.coerce.boolean().optional()
  })
});

export const createMenuCategorySchema = z.object({
  body: z.object({
    propertyId: objectId,
    name: z.string().min(2).max(100),
    description: z.string().max(300).optional(),
    displayOrder: z.coerce.number().int().min(0).default(0)
  })
});

export const createMenuItemSchema = z.object({
  body: z.object({
    propertyId: objectId,
    categoryId: objectId,
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
    price: z.coerce.number().min(0),
    imageUrl: z.string().url().optional().or(z.literal('')),
    preparationMinutes: z.coerce.number().int().min(0).default(20),
    isAvailable: z.boolean().default(true)
  })
});
