import { z } from 'zod';
import { objectId, paginationQuery } from './commonValidators.js';

export const listNotificationsSchema = z.object({
  query: paginationQuery.extend({
    unreadOnly: z.coerce.boolean().optional()
  })
});

export const markNotificationReadSchema = z.object({
  params: z.object({ id: objectId })
});
