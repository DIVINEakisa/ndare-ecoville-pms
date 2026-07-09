import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listOrdersSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled']).optional()
  })
});

export const createOrderSchema = z.object({
  body: z.object({
    propertyId: objectId,
    guestId: objectId,
    roomId: objectId.optional(),
    items: z
      .array(
        z.object({
          menuItemId: objectId,
          quantity: z.coerce.number().int().positive()
        })
      )
      .min(1)
  })
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled'])
  })
});
