import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const listSettingsSchema = z.object({
  query: z.object({
    propertyId: objectId.optional()
  })
});

export const upsertSettingSchema = z.object({
  body: z.object({
    propertyId: objectId,
    key: z.string().min(2).max(80),
    value: z.unknown(),
    description: z.string().max(300).optional()
  })
});

export const emailTemplateSchema = z.object({
  body: z.object({
    propertyId: objectId,
    name: z.string().min(2).max(100),
    key: z.string().min(2).max(80),
    subject: z.string().min(2).max(160),
    bodyHtml: z.string().min(2),
    bodyText: z.string().min(2),
    isActive: z.boolean().default(true)
  })
});
