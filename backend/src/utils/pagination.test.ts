import assert from 'node:assert/strict';
import test from 'node:test';
import { getPagination, paginationMeta } from './pagination.js';

test('getPagination clamps page and limit to safe values', () => {
  const req = { query: { page: '-4', limit: '500' } };
  const pagination = getPagination(req as never);
  assert.equal(pagination.page, 1);
  assert.equal(pagination.limit, 100);
  assert.equal(pagination.skip, 0);
});

test('paginationMeta calculates total pages', () => {
  assert.deepEqual(paginationMeta(2, 10, 31), {
    page: 2,
    limit: 10,
    total: 31,
    totalPages: 4
  });
});
