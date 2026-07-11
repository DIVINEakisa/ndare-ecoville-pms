import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const publicMenuSchema = z.object({
  params: z.object({ propertyId: objectId })
});

export const placePublicOrderSchema = z.object({
  params: z.object({ propertyId: objectId }),
  body: z.object({
    guestName:      z.string().min(2).max(120),
    locationType:   z.enum(['room', 'table']),
    locationNumber: z.string().min(1).max(20),
    notes:          z.string().max(500).optional(),
    items: z.array(
      z.object({
        menuItemId: objectId,
        quantity:   z.number().int().min(1).max(50)
      })
    ).min(1)
  })
});

export const publicOrderStatusSchema = z.object({
  params: z.object({ orderId: objectId })
});

export const publicQueueSchema = z.object({
  params: z.object({ propertyId: objectId })
});

export const publicOrderUpdateSchema = z.object({
  params: z.object({ orderId: objectId }),
  body: z.object({
    status: z.enum(['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled'])
  })
});
