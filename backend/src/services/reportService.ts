import type { Request, Response } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Folio } from '../models/Folio.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Payment } from '../models/Payment.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room } from '../models/Room.js';

function dateMatch(req: Request, field: string) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {})
    }
  };
}

export async function getReports(req: Request) {
  const scope = propertyFilter(req);
  const [revenue, paymentsByMethod, reservationsByStatus, roomsTotal, occupiedRooms, restaurant, inventoryLowStock, outstanding] =
    await Promise.all([
      Payment.aggregate([
        { $match: { ...scope, deletedAt: null, status: 'Completed', ...dateMatch(req, 'paidAt') } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...scope, deletedAt: null, status: 'Completed', ...dateMatch(req, 'paidAt') } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Reservation.aggregate([
        { $match: { ...scope, deletedAt: null, ...dateMatch(req, 'checkIn') } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } }
      ]),
      Room.countDocuments({ ...scope, deletedAt: null, status: { $ne: 'Inactive' } }),
      Room.countDocuments({ ...scope, deletedAt: null, status: 'Occupied' }),
      RestaurantOrder.aggregate([
        { $match: { ...scope, deletedAt: null, status: { $ne: 'Cancelled' }, ...dateMatch(req, 'createdAt') } },
        { $group: { _id: '$status', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      InventoryItem.countDocuments({ ...scope, deletedAt: null, $expr: { $lte: ['$quantityOnHand', '$lowStockThreshold'] } }),
      Folio.aggregate([
        { $match: { ...scope, deletedAt: null, balance: { $gt: 0 }, status: { $ne: 'Void' } } },
        { $group: { _id: null, total: { $sum: '$balance' }, count: { $sum: 1 } } }
      ])
    ]);

  return {
    revenue: revenue[0] ?? { total: 0, count: 0 },
    paymentsByMethod,
    reservationsByStatus,
    occupancy: {
      roomsTotal,
      occupiedRooms,
      rate: roomsTotal ? Math.round((occupiedRooms / roomsTotal) * 100) : 0
    },
    restaurant,
    inventory: { lowStockItems: inventoryLowStock },
    outstandingFolios: outstanding[0] ?? { total: 0, count: 0 }
  };
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function sendReportCsv(res: Response, report: Awaited<ReturnType<typeof getReports>>) {
  const rows = [
    ['Metric', 'Value'],
    ['Revenue total', report.revenue.total],
    ['Payment count', report.revenue.count],
    ['Occupancy rate', `${report.occupancy.rate}%`],
    ['Occupied rooms', report.occupancy.occupiedRooms],
    ['Total rooms', report.occupancy.roomsTotal],
    ['Low stock items', report.inventory.lowStockItems],
    ['Outstanding folio balance', report.outstandingFolios.total],
    ['Outstanding folio count', report.outstandingFolios.count]
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="hms-report.csv"');
  return res.status(200).send(csv);
}
