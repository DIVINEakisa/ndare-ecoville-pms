import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const guestPortalContextSchema = z.object({
  params: z.object({
    propertyId: objectId,
    roomId: objectId
  })
});

export const guestPortalOrderSchema = z.object({
  params: z.object({
    propertyId: objectId,
    roomId: objectId
  }),
  body: z.object({
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
