import type { Response } from 'express';

type Meta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export function ok<T>(res: Response, data: T, message = 'Request completed', meta?: Meta) {
  return res.status(200).json({ success: true, message, data, meta });
}

export function created<T>(res: Response, data: T, message = 'Resource created') {
  return res.status(201).json({ success: true, message, data });
}
