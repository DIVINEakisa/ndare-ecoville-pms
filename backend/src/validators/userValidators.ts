import { z } from 'zod';
import { userRoles } from '../types/roles.js';
import { objectId } from './commonValidators.js';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    role: z.enum(userRoles),
    propertyId: objectId
  })
});
