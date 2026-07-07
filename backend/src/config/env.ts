import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('NuvraHub HMS <no-reply@nuvrahub.com>'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);
