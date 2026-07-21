import { z } from 'zod';
import { userRoles } from '../types/roles.js';
import { objectId } from './commonValidators.js';

export const createUserSchema = z.object({
  body: z.object({
    fullName:   z.string().min(2).max(120),
    email:      z.string().email(),
    password:   z.string().min(8, 'Password must be at least 8 characters'),
    role:       z.enum(userRoles),
    propertyId: objectId
  })
});

export const userIdSchema = z.object({
  params: z.object({
    id: objectId
  })
});
