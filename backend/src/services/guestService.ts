import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Guest } from '../models/Guest.js';
import { Reservation } from '../models/Reservation.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

export async function listGuests(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    ...(search
      ? {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { documentNumber: { $regex: search, $options: 'i' } }
          ]
        }
      : {})
  };

  const guests = await Guest.find(filter).sort({ updatedAt: -1 }).lean();

  const guestIds = guests.map((g) => g._id);
  const latestReservations = await Reservation.aggregate([
    { $match: { guestId: { $in: guestIds }, deletedAt: null } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$guestId',
        status: { $first: '$status' }
      }
    }
  ]);

  const reservationMap = new Map(latestReservations.map((r) => [String(r._id), r.status]));

  let enriched = guests.map((g) => {
    const resStatus = reservationMap.get(String(g._id));
    let status: 'Checked In' | 'Reserved' | 'Checked Out' | 'Cancelled' | 'Registered' = 'Registered';
    if (resStatus === 'Checked In') status = 'Checked In';
    else if (resStatus === 'Pending' || resStatus === 'Confirmed') status = 'Reserved';
    else if (resStatus === 'Checked Out') status = 'Checked Out';
    else if (resStatus === 'Cancelled') status = 'Cancelled';
    return { ...g, status };
  });

  if (rawStatus && rawStatus.toLowerCase() !== 'all' && rawStatus.toLowerCase() !== 'all guests') {
    const targetStatus = rawStatus.toLowerCase();
    enriched = enriched.filter((g) => {
      if (targetStatus === 'active' || targetStatus === 'active guests' || targetStatus === 'checked in') {
        return g.status === 'Checked In';
      }
      if (targetStatus === 'reserved') {
        return g.status === 'Reserved';
      }
      if (targetStatus === 'checked out') {
        return g.status === 'Checked Out';
      }
      if (targetStatus === 'cancelled') {
        return g.status === 'Cancelled';
      }
      return true;
    });
  }

  const total = enriched.length;
  const items = enriched.slice(skip, skip + limit);

  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createGuest(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  return Guest.create({ ...req.body, createdBy: req.user?.id });
}

export async function updateGuest(req: Request) {
  const guest = await Guest.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!guest) throw new AppError(404, 'Guest not found', 'GUEST_NOT_FOUND');
  Object.assign(guest, req.body, { updatedBy: req.user?.id });
  await guest.save();
  return guest;
}
