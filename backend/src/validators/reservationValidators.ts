import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listReservationsSchema = z.object({
  query: paginationQuery.extend({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
  })
});

const reservationBody = z.object({
  propertyId: objectId,
  guestId: objectId,
  roomId: objectId,
  source: z.enum(['Direct', 'Lodgify', 'Phone', 'Walk-in']).default('Direct'),
  status: z.enum(['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'No Show']).default('Pending'),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  adults: z.coerce.number().int().positive().default(1),
  children: z.coerce.number().int().min(0).default(0),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional()
});

export const createReservationSchema = z.object({ body: reservationBody }).refine(
  (data) => data.body.checkOut > data.body.checkIn,
  { message: 'Check-out must be after check-in', path: ['body', 'checkOut'] }
);

export const updateReservationSchema = z
  .object({
    params: z.object({ id: objectId }),
    body: reservationBody.partial().omit({ propertyId: true })
  })
  .refine((data) => !data.body.checkIn || !data.body.checkOut || data.body.checkOut > data.body.checkIn, {
    message: 'Check-out must be after check-in',
    path: ['body', 'checkOut']
  });

export const availabilitySchema = z.object({
  query: z.object({
    propertyId: objectId,
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date()
  })
});
