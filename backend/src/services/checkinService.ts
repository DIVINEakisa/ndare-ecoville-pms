import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Folio } from '../models/Folio.js';
import { Guest } from '../models/Guest.js';
import { Payment } from '../models/Payment.js';
import { Reservation } from '../models/Reservation.js';
import { Room } from '../models/Room.js';
import { AppError } from '../utils/AppError.js';

export async function checkInReservation(req: Request) {
  const reservation = await Reservation.findOne({
    ...propertyFilter(req),
    _id: req.body.reservationId,
    deletedAt: null
  });
  if (!reservation) throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
  if (!['Pending', 'Confirmed'].includes(reservation.status)) {
    throw new AppError(422, 'Only pending or confirmed reservations can be checked in', 'INVALID_CHECKIN_STATUS');
  }
  const propertyId = reservation.get('propertyId');
  const reservationId = reservation._id;

  await Guest.updateOne(
    { _id: reservation.guestId, propertyId },
    {
      ...(req.body.guestDocument ?? {}),
      ...(req.body.emergencyContact ? { emergencyContact: req.body.emergencyContact } : {}),
      updatedBy: req.user?.id
    }
  );

  reservation.status = 'Checked In';
  reservation.set('updatedBy', req.user?.id);
  await reservation.save();
  await Room.updateOne({ _id: reservation.roomId }, { status: 'Occupied', updatedBy: req.user?.id });

  const folio = await Folio.findOneAndUpdate(
    { reservationId, propertyId, deletedAt: null },
    {
      guestId: reservation.guestId,
      reservationId,
      propertyId,
      status: 'Open',
      subtotal: reservation.totalAmount,
      paidTotal: reservation.paidAmount,
      balance: Math.max(reservation.totalAmount - reservation.paidAmount, 0),
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (req.body.payment?.amount > 0) {
    await Payment.create({
      propertyId,
      folioId: folio._id,
      guestId: reservation.guestId,
      amount: req.body.payment.amount,
      method: req.body.payment.method,
      reference: req.body.payment.reference,
      createdBy: req.user?.id
    });
    folio.paidTotal += req.body.payment.amount;
    folio.balance = Math.max(folio.subtotal + folio.taxTotal - folio.paidTotal, 0);
    folio.status = folio.balance > 0 ? 'Partially Paid' : 'Settled';
    await folio.save();
  }

  return { reservation, folio };
}

export async function checkOutReservation(req: Request) {
  const reservation = await Reservation.findOne({
    ...propertyFilter(req),
    _id: req.body.reservationId,
    deletedAt: null
  });
  if (!reservation) throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
  if (reservation.status !== 'Checked In') {
    throw new AppError(422, 'Only checked-in reservations can be checked out', 'INVALID_CHECKOUT_STATUS');
  }
  const propertyId = reservation.get('propertyId');

  const folio = await Folio.findOne({ reservationId: reservation._id, propertyId, deletedAt: null });
  if (!folio) throw new AppError(404, 'Folio not found for reservation', 'FOLIO_NOT_FOUND');

  if (req.body.payment?.amount > 0) {
    await Payment.create({
      propertyId,
      folioId: folio._id,
      guestId: reservation.guestId,
      amount: req.body.payment.amount,
      method: req.body.payment.method,
      reference: req.body.payment.reference,
      createdBy: req.user?.id
    });
    folio.paidTotal += req.body.payment.amount;
    folio.balance = Math.max(folio.subtotal + folio.taxTotal - folio.paidTotal, 0);
  }

  if (folio.balance > 0) {
    throw new AppError(422, 'Outstanding folio balance must be settled before checkout', 'OUTSTANDING_BALANCE', {
      balance: folio.balance
    });
  }

  folio.status = 'Settled';
  folio.set('updatedBy', req.user?.id);
  await folio.save();

  reservation.status = 'Checked Out';
  reservation.set('updatedBy', req.user?.id);
  await reservation.save();
  await Room.updateOne({ _id: reservation.roomId }, { status: 'Available', updatedBy: req.user?.id });

  return { reservation, folio };
}
