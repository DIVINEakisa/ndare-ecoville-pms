import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listRequisitionsSchema = z.object({
  query: paginationQuery.extend({
    // Accept empty string from "All statuses" dropdown and treat it as omitted
    status: z
      .string()
      .optional()
      .transform((val) => (val === '' || !val ? undefined : val))
      .pipe(z.enum(['Pending', 'Approved', 'Rejected', 'Received']).optional())
  })
});

export const createRequisitionSchema = z.object({
  body: z.object({
    propertyId: objectId,
    department: z.string().min(2).max(100),
    notes: z.string().max(500).optional(),
    items: z
      .array(
        z.object({
          inventoryItemId: objectId,
          quantity: z.coerce.number().int().positive()
        })
      )
      .min(1)
  })
});

export const requisitionDecisionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    reason: z.string().max(500).optional()
  })
});
