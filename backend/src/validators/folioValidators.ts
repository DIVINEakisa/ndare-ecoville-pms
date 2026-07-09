import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listFoliosSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['Open', 'Settled', 'Partially Paid', 'Void']).optional()
  })
});

export const getFolioSchema = z.object({
  params: z.object({ id: objectId })
});

export const folioPaymentSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    amount: z.coerce.number().positive(),
    method: z.enum(['Cash', 'Card', 'MTN Mobile Money', 'Airtel Money']),
    reference: z.string().max(120).optional()
  })
});
