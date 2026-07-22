import type { Request } from 'express';
import { Types } from 'mongoose';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Guest } from '../models/Guest.js';
import { Reservation } from '../models/Reservation.js';
import { Room } from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

async function assertReservationReferences(propertyId: string, guestId: string, roomId: string) {
  const [guest, room] = await Promise.all([
    Guest.exists({ _id: guestId, propertyId, deletedAt: null }),
    Room.exists({ _id: roomId, propertyId, deletedAt: null, status: { $ne: 'Inactive' } })
  ]);
  if (!guest) throw new AppError(404, 'Guest not found for selected property', 'GUEST_NOT_FOUND');
  if (!room) throw new AppError(404, 'Room not found for selected property', 'ROOM_NOT_FOUND');
}

export async function assertNoDoubleBooking(input: {
  propertyId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  excludeReservationId?: string;
}) {
  const conflict = await Reservation.findOne({
    propertyId: new Types.ObjectId(input.propertyId),
    roomId: new Types.ObjectId(input.roomId),
    deletedAt: null,
    status: { $in: ['Pending', 'Confirmed', 'Checked In'] },
    ...(input.excludeReservationId ? { _id: { $ne: input.excludeReservationId } } : {}),
    checkIn: { $lt: input.checkOut },
    checkOut: { $gt: input.checkIn }
  }).lean();

  if (conflict) {
    throw new AppError(409, 'Room is already booked for the selected dates', 'DOUBLE_BOOKING');
  }
}

export async function listReservations(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const isAllStatus = !rawStatus || rawStatus.toLowerCase() === 'all' || rawStatus.toLowerCase() === 'all statuses';

  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    ...(!isAllStatus ? { status: rawStatus } : {}),
    ...(from && to ? { checkIn: { $lt: to }, checkOut: { $gt: from } } : {}),
    ...(search ? { notes: { $regex: search, $options: 'i' } } : {})
  };

  const [items, total] = await Promise.all([
    Reservation.find(filter)
      .populate('guestId', 'fullName phone email')
      .populate('roomId', 'roomNumber name type')
      .sort({ checkIn: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(filter)
  ]);

  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createReservation(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  await assertReservationReferences(req.body.propertyId, req.body.guestId, req.body.roomId);
  await assertNoDoubleBooking(req.body);

  const reservation = await Reservation.create({ ...req.body, createdBy: req.user?.id });
  if (reservation.status === 'Confirmed' || reservation.status === 'Pending') {
    await Room.updateOne({ _id: reservation.roomId, status: 'Available' }, { status: 'Reserved' });
  }
  return reservation.populate([
    { path: 'guestId', select: 'fullName phone email' },
    { path: 'roomId', select: 'roomNumber name type' }
  ]);
}

export async function updateReservation(req: Request) {
  const reservation = await Reservation.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!reservation) throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
  if (['Checked In', 'Checked Out'].includes(reservation.status)) {
    throw new AppError(422, 'Checked-in or checked-out reservations cannot be edited here', 'RESERVATION_LOCKED');
  }

  const next = {
    propertyId: String(reservation.get('propertyId')),
    guestId: String(req.body.guestId ?? reservation.guestId),
    roomId: String(req.body.roomId ?? reservation.roomId),
    checkIn: req.body.checkIn ?? reservation.checkIn,
    checkOut: req.body.checkOut ?? reservation.checkOut
  };

  await assertReservationReferences(next.propertyId, next.guestId, next.roomId);
  await assertNoDoubleBooking({ ...next, excludeReservationId: String(reservation._id) });

  Object.assign(reservation, req.body, { updatedBy: req.user?.id });
  await reservation.save();
  return reservation.populate([
    { path: 'guestId', select: 'fullName phone email' },
    { path: 'roomId', select: 'roomNumber name type' }
  ]);
}
