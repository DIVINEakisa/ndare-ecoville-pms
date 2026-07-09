import type { Request } from 'express';

export function getPagination(req: Request) {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  };
}
