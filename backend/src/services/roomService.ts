import type { Request } from 'express';
import { Types } from 'mongoose';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Room } from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

export async function listRooms(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          $or: [
            { roomNumber: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { type: { $regex: search, $options: 'i' } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    Room.find(filter).sort({ roomNumber: 1 }).skip(skip).limit(limit).lean(),
    Room.countDocuments(filter)
  ]);

  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createRoom(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  return Room.create({ ...req.body, createdBy: req.user?.id });
}

export async function updateRoom(req: Request) {
  const room = await Room.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!room) throw new AppError(404, 'Room not found', 'ROOM_NOT_FOUND');

  // Housekeepers can only change status — prevent accidental overwrite of
  // room configuration fields (rate, type, capacity, etc.)
  const isHousekeeper = req.user?.role === 'Housekeeper';
  const allowedFields = isHousekeeper
    ? { status: req.body.status }
    : req.body;

  Object.assign(room, allowedFields, { updatedBy: req.user?.id });
  await room.save();
  return room;
}

export async function listAvailableRooms(propertyId: string, checkIn: Date, checkOut: Date) {
  const overlapping = await import('../models/Reservation.js').then(({ Reservation }) =>
    Reservation.find({
      propertyId: new Types.ObjectId(propertyId),
      deletedAt: null,
      status: { $in: ['Pending', 'Confirmed', 'Checked In'] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    }).distinct('roomId')
  );

  return Room.find({
    propertyId,
    deletedAt: null,
    status: { $in: ['Available', 'Reserved'] },
    _id: { $nin: overlapping }
  })
    .sort({ roomNumber: 1 })
    .lean();
}
