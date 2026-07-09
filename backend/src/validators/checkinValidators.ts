import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const checkInSchema = z.object({
  body: z.object({
    reservationId: objectId,
    guestDocument: z
      .object({
        documentType: z.enum(['Passport', 'National ID', 'Driver License', 'Other']).optional(),
        documentNumber: z.string().max(80).optional()
      })
      .optional(),
    emergencyContact: z
      .object({
        name: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
        relationship: z.string().max(80).optional()
      })
      .optional(),
    payment: z
      .object({
        amount: z.coerce.number().min(0),
        method: z.enum(['Cash', 'Card', 'MTN Mobile Money', 'Airtel Money']),
        reference: z.string().max(120).optional()
      })
      .optional()
  })
});

export const checkOutSchema = z.object({
  body: z.object({
    reservationId: objectId,
    payment: z
      .object({
        amount: z.coerce.number().min(0),
        method: z.enum(['Cash', 'Card', 'MTN Mobile Money', 'Airtel Money']),
        reference: z.string().max(120).optional()
      })
      .optional()
  })
});
