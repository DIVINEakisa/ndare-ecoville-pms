import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

const guestBody = z.object({
  propertyId: objectId,
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(3).max(40).optional().or(z.literal('')),
  nationality: z.string().max(80).optional(),
  documentType: z.enum(['Passport', 'National ID', 'Driver License', 'Other']).optional(),
  documentNumber: z.string().max(80).optional(),
  emergencyContact: z
    .object({
      name: z.string().max(120).optional(),
      phone: z.string().max(40).optional(),
      relationship: z.string().max(80).optional()
    })
    .optional()
});

export const listGuestsSchema = z.object({ query: paginationQuery });
export const createGuestSchema = z.object({ body: guestBody });
export const updateGuestSchema = z.object({
  params: z.object({ id: objectId }),
  body: guestBody.partial().omit({ propertyId: true })
});
