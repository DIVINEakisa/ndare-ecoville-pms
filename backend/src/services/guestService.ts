import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Guest } from '../models/Guest.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

export async function listGuests(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search : '';
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

  const [items, total] = await Promise.all([
    Guest.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Guest.countDocuments(filter)
  ]);

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
