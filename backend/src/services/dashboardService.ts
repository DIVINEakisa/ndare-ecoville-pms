import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Folio } from '../models/Folio.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Payment } from '../models/Payment.js';
import { Property } from '../models/Property.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room } from '../models/Room.js';

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardSummary(req: Request) {
  const scope = propertyFilter(req);
  const today = startOfToday();

  const [
    roomsTotal,
    occupiedRooms,
    pendingReservations,
    arrivalsToday,
    departuresToday,
    revenue,
    restaurantSales,
    outstandingFolios,
    lowStockItems,
    kitchenQueue
  ] = await Promise.all([
    Room.countDocuments({ ...scope, deletedAt: null, status: { $ne: 'Inactive' } }),
    Room.countDocuments({ ...scope, deletedAt: null, status: 'Occupied' }),
    Reservation.countDocuments({ ...scope, deletedAt: null, status: 'Pending' }),
    Reservation.countDocuments({ ...scope, deletedAt: null, checkIn: { $gte: today }, status: 'Confirmed' }),
    Reservation.countDocuments({ ...scope, deletedAt: null, checkOut: { $gte: today }, status: 'Checked In' }),
    Payment.aggregate([
      { $match: { ...scope, deletedAt: null, status: 'Completed', paidAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    RestaurantOrder.aggregate([
      { $match: { ...scope, deletedAt: null, createdAt: { $gte: today }, status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Folio.countDocuments({ ...scope, deletedAt: null, balance: { $gt: 0 }, status: { $ne: 'Void' } }),
    InventoryItem.countDocuments({
      ...scope,
      deletedAt: null,
      $expr: { $lte: ['$quantityOnHand', '$lowStockThreshold'] }
    }),
    RestaurantOrder.countDocuments({
      ...scope,
      deletedAt: null,
      status: { $in: ['Received', 'Preparing'] }
    })
  ]);

  return {
    roomsTotal,
    occupiedRooms,
    occupancyRate: roomsTotal ? Math.round((occupiedRooms / roomsTotal) * 100) : 0,
    pendingReservations,
    arrivalsToday,
    departuresToday,
    revenueToday: revenue[0]?.total ?? 0,
    restaurantSalesToday: restaurantSales[0]?.total ?? 0,
    outstandingFolios,
    lowStockItems,
    kitchenQueue
  };
}

export async function getOwnerPortfolioSummary() {
  const properties = await Property.find({ deletedAt: null, isActive: true }).lean();
  const summaries = await Promise.all(
    properties.map(async (property) => {
      const propertyId = property._id;
      const [roomsTotal, occupiedRooms, revenue] = await Promise.all([
        Room.countDocuments({ propertyId, deletedAt: null, status: { $ne: 'Inactive' } }),
        Room.countDocuments({ propertyId, deletedAt: null, status: 'Occupied' }),
        Payment.aggregate([
          { $match: { propertyId, deletedAt: null, status: 'Completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      return {
        id: String(property._id),
        name: property.name,
        roomsTotal,
        occupiedRooms,
        occupancyRate: roomsTotal ? Math.round((occupiedRooms / roomsTotal) * 100) : 0,
        revenue: revenue[0]?.total ?? 0
      };
    })
  );

  return summaries;
}
