import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', result.error.flatten());
    }

    req.body = result.data.body ?? req.body;
    req.params = result.data.params ?? req.params;
    req.query = result.data.query ?? req.query;
    next();
  };
}
