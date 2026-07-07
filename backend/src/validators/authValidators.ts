import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password: z.string().min(10)
  })
});
