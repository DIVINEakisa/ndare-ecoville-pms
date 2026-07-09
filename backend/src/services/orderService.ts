import type { Request } from 'express';
import { Types } from 'mongoose';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Folio } from '../models/Folio.js';
import { FolioItem } from '../models/FolioItem.js';
import { Guest } from '../models/Guest.js';
import { MenuItem } from '../models/MenuItem.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room } from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

async function nextOrderNumber(propertyId: string) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await RestaurantOrder.countDocuments({
    propertyId: new Types.ObjectId(propertyId),
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  return `ORD-${today}-${String(count + 1).padStart(4, '0')}`;
}

async function findActiveFolio(propertyId: string, guestId: string, roomId?: string) {
  const reservation = await Reservation.findOne({
    propertyId,
    guestId,
    ...(roomId ? { roomId } : {}),
    status: 'Checked In',
    deletedAt: null
  }).lean();
  if (!reservation) throw new AppError(422, 'Restaurant orders are only available for checked-in guests', 'GUEST_NOT_CHECKED_IN');
  const folio = await Folio.findOne({ propertyId, reservationId: reservation._id, guestId, deletedAt: null });
  if (!folio) throw new AppError(404, 'Open folio not found for checked-in guest', 'FOLIO_NOT_FOUND');
  return { folio, reservation };
}

export async function listOrders(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const filter = { ...propertyFilter(req), deletedAt: null, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    RestaurantOrder.find(filter)
      .populate('guestId', 'fullName phone')
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RestaurantOrder.countDocuments(filter)
  ]);
  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createOrder(req: Request, options: { publicPortal?: boolean } = {}) {
  if (!options.publicPortal) assertPropertyAccess(req, req.body.propertyId);
  const propertyId = req.body.propertyId;
  const guest = await Guest.exists({ _id: req.body.guestId, propertyId, deletedAt: null });
  if (!guest) throw new AppError(404, 'Guest not found for selected property', 'GUEST_NOT_FOUND');
  if (req.body.roomId) {
    const room = await Room.exists({ _id: req.body.roomId, propertyId, deletedAt: null });
    if (!room) throw new AppError(404, 'Room not found for selected property', 'ROOM_NOT_FOUND');
  }

  const { folio } = await findActiveFolio(propertyId, req.body.guestId, req.body.roomId);
  const menuIds = req.body.items.map((item: { menuItemId: string }) => item.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: menuIds }, propertyId, deletedAt: null, isActive: true, isAvailable: true }).lean();
  if (menuItems.length !== menuIds.length) throw new AppError(422, 'One or more menu items are unavailable', 'MENU_ITEM_UNAVAILABLE');

  const orderItems = req.body.items.map((item: { menuItemId: string; quantity: number }) => {
    const menuItem = menuItems.find((candidate) => String(candidate._id) === item.menuItemId);
    if (!menuItem) throw new AppError(422, 'Menu item unavailable', 'MENU_ITEM_UNAVAILABLE');
    return {
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      total: item.quantity * menuItem.price
    };
  });
  const totalAmount = orderItems.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

  const order = await RestaurantOrder.create({
    propertyId,
    guestId: req.body.guestId,
    roomId: req.body.roomId,
    folioId: folio._id,
    orderNumber: await nextOrderNumber(propertyId),
    items: orderItems,
    totalAmount,
    createdBy: options.publicPortal ? undefined : req.user?.id
  });

  return order.populate([
    { path: 'guestId', select: 'fullName phone' },
    { path: 'roomId', select: 'roomNumber' }
  ]);
}

export async function createPortalOrder(input: {
  propertyId: string;
  roomId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
}) {
  const reservation = await Reservation.findOne({
    propertyId: input.propertyId,
    roomId: input.roomId,
    status: 'Checked In',
    deletedAt: null
  }).lean();
  if (!reservation) throw new AppError(422, 'No checked-in guest is assigned to this room', 'NO_ACTIVE_STAY');

  const req = {
    body: {
      propertyId: input.propertyId,
      guestId: String(reservation.guestId),
      roomId: input.roomId,
      items: input.items
    }
  } as Request;

  return createOrder(req, { publicPortal: true });
}

export async function updateOrderStatus(req: Request) {
  const order = await RestaurantOrder.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  order.status = req.body.status;
  order.set('updatedBy', req.user?.id);
  await order.save();

  if (order.status === 'Delivered') {
    const existing = await FolioItem.exists({ source: 'Restaurant', sourceId: order._id });
    if (!existing) {
      const folio = await Folio.findById(order.folioId);
      if (!folio) throw new AppError(404, 'Folio not found for order', 'FOLIO_NOT_FOUND');
      await FolioItem.create({
        propertyId: order.get('propertyId'),
        folioId: order.folioId,
        guestId: order.guestId,
        source: 'Restaurant',
        sourceId: order._id,
        description: `Restaurant order ${order.orderNumber}`,
        quantity: 1,
        unitPrice: order.totalAmount,
        total: order.totalAmount,
        createdBy: req.user?.id
      });
      folio.subtotal += order.totalAmount;
      folio.balance = Math.max(folio.subtotal + folio.taxTotal - folio.paidTotal, 0);
      folio.status = folio.balance > 0 ? 'Partially Paid' : 'Settled';
      await folio.save();
    }
  }

  return order.populate([
    { path: 'guestId', select: 'fullName phone' },
    { path: 'roomId', select: 'roomNumber' }
  ]);
}
