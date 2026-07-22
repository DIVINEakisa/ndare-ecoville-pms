import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Folio } from '../models/Folio.js';
import { FolioItem } from '../models/FolioItem.js';
import { Payment } from '../models/Payment.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

export async function listFolios(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const isAllStatus = !rawStatus || rawStatus.toLowerCase() === 'all' || rawStatus.toLowerCase() === 'all statuses';

  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    ...(!isAllStatus ? { status: rawStatus } : {})
  };

  const [folios, total] = await Promise.all([
    Folio.find(filter)
      .populate('guestId', 'fullName email phone')
      .populate('reservationId', 'checkIn checkOut status')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Folio.countDocuments(filter)
  ]);

  const items = search
    ? folios.filter((folio) => {
        const guest = folio.guestId as unknown as { fullName?: string; email?: string; phone?: string };
        return [guest.fullName, guest.email, guest.phone].some((value) => value?.toLowerCase().includes(search.toLowerCase()));
      })
    : folios;

  return { items, meta: paginationMeta(page, limit, total) };
}

export async function getFolio(req: Request) {
  const folio = await Folio.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null })
    .populate('guestId', 'fullName email phone')
    .populate('reservationId', 'checkIn checkOut status')
    .lean();
  if (!folio) throw new AppError(404, 'Folio not found', 'FOLIO_NOT_FOUND');

  const [items, payments] = await Promise.all([
    FolioItem.find({ ...propertyFilter(req), folioId: req.params.id, deletedAt: null }).sort({ postedAt: -1 }).lean(),
    Payment.find({ ...propertyFilter(req), folioId: req.params.id, deletedAt: null }).sort({ paidAt: -1 }).lean()
  ]);

  return { folio, items, payments };
}

export async function postFolioPayment(req: Request) {
  const folio = await Folio.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!folio) throw new AppError(404, 'Folio not found', 'FOLIO_NOT_FOUND');
  if (folio.status === 'Void') throw new AppError(422, 'Cannot post payment to a void folio', 'VOID_FOLIO');

  await Payment.create({
    propertyId: folio.get('propertyId'),
    folioId: folio._id,
    guestId: folio.guestId,
    amount: req.body.amount,
    method: req.body.method,
    reference: req.body.reference,
    createdBy: req.user?.id
  });

  folio.paidTotal += req.body.amount;
  folio.balance = Math.max(folio.subtotal + folio.taxTotal - folio.paidTotal, 0);
  folio.status = folio.balance > 0 ? 'Partially Paid' : 'Settled';
  folio.set('updatedBy', req.user?.id);
  await folio.save();

  return folio.populate([
    { path: 'guestId', select: 'fullName email phone' },
    { path: 'reservationId', select: 'checkIn checkOut status' }
  ]);
}
