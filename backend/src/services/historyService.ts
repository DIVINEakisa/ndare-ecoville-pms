import type { Request } from 'express';
import { Types } from 'mongoose';
import { propertyFilter } from '../middleware/propertyScope.js';
import { AuditLog } from '../models/AuditLog.js';
import { Folio } from '../models/Folio.js';
import { FolioItem } from '../models/FolioItem.js';
import { Guest } from '../models/Guest.js';
import { Payment } from '../models/Payment.js';
import { Reservation } from '../models/Reservation.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

const HISTORY_STATUSES = ['Checked Out', 'Cancelled', 'No Show'] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDateRange(req: Request) {
  const from = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined;
  const to = req.query.dateTo
    ? new Date(new Date(String(req.query.dateTo)).setHours(23, 59, 59, 999))
    : undefined;
  return { from, to };
}

// ─── listHistory ──────────────────────────────────────────────────────────────

export async function listHistory(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const { from, to } = getDateRange(req);

  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const guestName = typeof req.query.guestName === 'string' ? req.query.guestName.trim() : '';
  const reservationId = typeof req.query.reservationId === 'string' ? req.query.reservationId.trim() : '';
  const roomNumber = typeof req.query.roomNumber === 'string' ? req.query.roomNumber.trim() : '';
  const receptionistId = typeof req.query.receptionistId === 'string' ? req.query.receptionistId.trim() : '';
  const paymentStatus = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus.trim() : '';

  // Resolve guestId filter from guestName
  let guestIdFilter: Types.ObjectId[] | undefined;
  const nameQuery = guestName || search;
  if (nameQuery) {
    const guests = await Guest.find({
      ...propertyFilter(req),
      fullName: { $regex: nameQuery, $options: 'i' },
      deletedAt: null,
    }).select('_id').lean();
    guestIdFilter = guests.map((g) => g._id as Types.ObjectId);
    if (guestIdFilter.length === 0) {
      // No matching guests → return empty result fast
      const empty = { items: [], meta: paginationMeta(page, limit, 0) };
      const summary = await getHistorySummaryData(req, from, to);
      return { ...empty, summary };
    }
  }

  // Resolve roomId filter from roomNumber
  let roomIdFilter: Types.ObjectId[] | undefined;
  if (roomNumber) {
    const rooms = await Room.find({
      ...propertyFilter(req),
      roomNumber: { $regex: roomNumber, $options: 'i' },
      deletedAt: null,
    }).select('_id').lean();
    roomIdFilter = rooms.map((r) => r._id as Types.ObjectId);
  }

  // Build the main filter
  const validStatuses =
    rawStatus && HISTORY_STATUSES.includes(rawStatus as typeof HISTORY_STATUSES[number])
      ? [rawStatus]
      : HISTORY_STATUSES;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {
    ...propertyFilter(req),
    deletedAt: null,
    status: { $in: validStatuses },
  };

  if (from && to) filter.checkOut = { $gte: from, $lte: to };
  else if (from) filter.checkOut = { $gte: from };
  else if (to) filter.checkOut = { $lte: to };

  if (guestIdFilter) filter.guestId = { $in: guestIdFilter };
  if (roomIdFilter) filter.roomId = { $in: roomIdFilter };

  if (reservationId) {
    try {
      filter._id = new Types.ObjectId(reservationId);
    } catch {
      // Invalid ObjectId — return empty
      const empty = { items: [], meta: paginationMeta(page, limit, 0) };
      const summary = await getHistorySummaryData(req, from, to);
      return { ...empty, summary };
    }
  }

  if (receptionistId) filter.createdBy = new Types.ObjectId(receptionistId);

  const sort = req.query.sort === 'asc' ? 1 : -1;
  const sortField = String(req.query.sortField ?? 'checkOut');
  const allowedSortFields = ['checkIn', 'checkOut', 'totalAmount', 'createdAt'];
  const resolvedSortField = allowedSortFields.includes(sortField) ? sortField : 'checkOut';

  const [items, total] = await Promise.all([
    Reservation.find(filter)
      .populate('guestId', 'fullName phone email nationality documentType documentNumber')
      .populate('roomId', 'roomNumber name type floor')
      .populate('createdBy', 'fullName')
      .sort({ [resolvedSortField]: sort })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  // Attach folio payment status if requested
  let enrichedItems = items;
  if (paymentStatus) {
    const reservationIds = items.map((r) => r._id);
    const folios = await Folio.find({
      ...propertyFilter(req),
      reservationId: { $in: reservationIds },
      deletedAt: null,
    }).select('reservationId status').lean();

    const folioMap = new Map(
      folios.map((f) => [String(f.reservationId), f.status])
    );
    enrichedItems = items.filter((r) => folioMap.get(String(r._id)) === paymentStatus);
  }

  const summary = await getHistorySummaryData(req, from, to);

  return {
    items: enrichedItems,
    meta: paginationMeta(page, limit, total),
    summary,
  };
}

// ─── getHistorySummaryData ────────────────────────────────────────────────────

async function getHistorySummaryData(
  req: Request,
  from?: Date,
  to?: Date
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodFilter: Record<string, any> = {
    ...propertyFilter(req),
    deletedAt: null,
    status: { $in: HISTORY_STATUSES },
  };
  if (from && to) periodFilter.checkOut = { $gte: from, $lte: to };

  const [totalStays, cancelledCount, noShowCount, todayCheckouts, revenueAgg] =
    await Promise.all([
      Reservation.countDocuments(periodFilter),
      Reservation.countDocuments({ ...periodFilter, status: 'Cancelled' }),
      Reservation.countDocuments({ ...periodFilter, status: 'No Show' }),
      Reservation.countDocuments({
        ...propertyFilter(req),
        deletedAt: null,
        status: 'Checked Out',
        checkOut: { $gte: todayStart, $lte: todayEnd },
      }),
      Reservation.aggregate([
        {
          $match: {
            ...periodFilter,
            status: 'Checked Out',
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

  return {
    totalStays,
    cancelledCount,
    noShowCount,
    todayCheckouts,
    totalRevenue: revenueAgg[0]?.total ?? 0,
  };
}

// ─── getHistoryDetail ─────────────────────────────────────────────────────────

export async function getHistoryDetail(req: Request) {
  const reservation = await Reservation.findOne({
    ...propertyFilter(req),
    _id: req.params.id,
    deletedAt: null,
    status: { $in: HISTORY_STATUSES },
  })
    .populate('guestId', 'fullName phone email nationality documentType documentNumber emergencyContact')
    .populate<{ roomId: { _id: Types.ObjectId; roomNumber: string; name?: string; type: string; floor?: number } }>(
      'roomId',
      'roomNumber name type floor'
    )
    .populate('createdBy', 'fullName email role')
    .lean();

  if (!reservation) throw new AppError(404, 'History record not found', 'NOT_FOUND');

  const reservationId = reservation._id as Types.ObjectId;
  const propFilter = propertyFilter(req);

  // Folio & line items & payments
  const folio = await Folio.findOne({
    ...propFilter,
    reservationId,
    deletedAt: null,
  }).lean();

  const [folioItems, payments] = folio
    ? await Promise.all([
        FolioItem.find({ ...propFilter, folioId: folio._id, deletedAt: null })
          .sort({ postedAt: 1 })
          .lean(),
        Payment.find({ ...propFilter, folioId: folio._id, deletedAt: null })
          .sort({ paidAt: 1 })
          .lean(),
      ])
    : [[], []];

  // Aggregate charges by source
  const charges = { room: 0, restaurant: 0, laundry: 0, other: 0 };
  for (const item of folioItems) {
    if (item.source === 'Room') charges.room += item.total;
    else if (item.source === 'Restaurant') charges.restaurant += item.total;
    else if (item.source === 'Service' && item.description?.toLowerCase().includes('laundry'))
      charges.laundry += item.total;
    else charges.other += item.total;
  }

  // Activity timeline from AuditLog
  const timeline = await AuditLog.find({
    $or: [
      { resource: { $regex: String(reservationId), $options: 'i' } },
      { 'metadata.reservationId': String(reservationId) },
    ],
    action: {
      $in: [
        'CREATE_RESERVATION',
        'CHECK_IN',
        'CHECK_OUT',
        'CANCEL_RESERVATION',
        'UPDATE_RESERVATION',
        'ADD_FOLIO_ITEM',
        'SETTLE_PAYMENT',
        'CREATE_FOLIO',
      ],
    },
  })
    .sort({ timestamp: 1 })
    .limit(50)
    .lean();

  return {
    reservation,
    folio,
    folioItems,
    payments,
    charges,
    timeline,
  };
}

// ─── getGuestHistory ──────────────────────────────────────────────────────────

export async function getGuestHistory(req: Request) {
  const guestId = req.params.guestId;

  const guest = await Guest.findOne({
    ...propertyFilter(req),
    _id: guestId,
    deletedAt: null,
  }).lean();
  if (!guest) throw new AppError(404, 'Guest not found', 'GUEST_NOT_FOUND');

  const stays = await Reservation.find({
    ...propertyFilter(req),
    guestId: new Types.ObjectId(guestId),
    deletedAt: null,
    status: { $in: HISTORY_STATUSES },
  })
    .populate('roomId', 'roomNumber name type')
    .sort({ checkOut: -1 })
    .lean();

  // Aggregate stats
  let totalSpent = 0;
  let totalNights = 0;
  const roomFrequency: Record<string, { name: string; count: number }> = {};

  for (const stay of stays) {
    if (stay.status === 'Checked Out') totalSpent += stay.totalAmount;
    const nights = Math.max(
      Math.ceil(
        (new Date(stay.checkOut).getTime() - new Date(stay.checkIn).getTime()) / 86_400_000
      ),
      1
    );
    totalNights += nights;
    const room = stay.roomId as unknown as { _id: Types.ObjectId; roomNumber: string; name?: string } | null;
    if (room?._id) {
      const key = String(room._id);
      if (!roomFrequency[key]) roomFrequency[key] = { name: room.name || room.roomNumber, count: 0 };
      roomFrequency[key].count++;
    }
  }

  const favoriteRoom = Object.values(roomFrequency).sort((a, b) => b.count - a.count)[0]?.name ?? null;
  const avgNights = stays.length > 0 ? Math.round(totalNights / stays.length) : 0;
  const lastVisit = stays.length > 0 ? stays[0].checkOut : null;

  return {
    guest,
    stats: {
      totalVisits: stays.length,
      totalSpent,
      avgNights,
      favoriteRoom,
      lastVisit,
    },
    stays,
  };
}

// ─── getReceptionists ─────────────────────────────────────────────────────────

export async function getReceptionists(req: Request) {
  // Returns users who have created at least one reservation for this property
  const createdByIds = await Reservation.distinct('createdBy', {
    ...propertyFilter(req),
    deletedAt: null,
    status: { $in: HISTORY_STATUSES },
  });

  const users = await User.find({ _id: { $in: createdByIds } })
    .select('_id fullName role')
    .lean();

  return users;
}
