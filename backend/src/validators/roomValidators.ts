import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

const roomBody = z.object({
  propertyId: objectId,
  roomNumber: z.string().min(1).max(20),
  name: z.string().max(80).optional(),
  type: z.string().min(1).max(80),
  capacity: z.coerce.number().int().positive(),
  baseRate: z.coerce.number().min(0),
  status: z.enum(['Available', 'Occupied', 'Reserved', 'Maintenance', 'Inactive']).optional(),
  amenities: z.array(z.string().trim()).optional()
});

export const listRoomsSchema = z.object({ query: paginationQuery });
export const createRoomSchema = z.object({ body: roomBody });
export const updateRoomSchema = z.object({
  params: z.object({ id: objectId }),
  body: roomBody.partial().omit({ propertyId: true })
});
