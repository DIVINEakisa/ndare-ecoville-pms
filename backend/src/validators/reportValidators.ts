import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const reportQuerySchema = z.object({
  query: z.object({
    propertyId: objectId.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    format: z.enum(['json', 'csv']).default('json').optional()
  })
});
