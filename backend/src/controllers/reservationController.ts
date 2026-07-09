import type { Request, Response } from 'express';
import { createReservation, listReservations, updateReservation } from '../services/reservationService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listReservationsController(req: Request, res: Response) {
  const result = await listReservations(req);
  return ok(res, result.items, 'Reservations loaded', result.meta);
}

export async function createReservationController(req: Request, res: Response) {
  const reservation = await createReservation(req);
  return created(res, reservation, 'Reservation created');
}

export async function updateReservationController(req: Request, res: Response) {
  const reservation = await updateReservation(req);
  return ok(res, reservation, 'Reservation updated');
}
