import assert from 'node:assert/strict';
import test from 'node:test';
import { sendReportCsv } from './reportService.js';

test('sendReportCsv emits a downloadable CSV response', () => {
  const headers = new Map<string, string>();
  let statusCode = 0;
  let body = '';
  const res = {
    setHeader: (key: string, value: string) => headers.set(key, value),
    status: (code: number) => {
      statusCode = code;
      return {
        send: (payload: string) => {
          body = payload;
        }
      };
    }
  };

  sendReportCsv(res as never, {
    revenue: { total: 1000, count: 2 },
    paymentsByMethod: [],
    reservationsByStatus: [],
    occupancy: { roomsTotal: 10, occupiedRooms: 5, rate: 50 },
    restaurant: [],
    inventory: { lowStockItems: 3 },
    outstandingFolios: { total: 500, count: 1 }
  });

  assert.equal(statusCode, 200);
  assert.equal(headers.get('Content-Type'), 'text/csv');
  assert.match(body, /Revenue total/);
  assert.match(body, /"1000"/);
});
