import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const payload = {
    success: false,
    message: error instanceof Error ? error.message : 'Unexpected server error',
    code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
    details: error instanceof AppError ? error.details : undefined
  };

  res.status(statusCode).json(payload);
};
