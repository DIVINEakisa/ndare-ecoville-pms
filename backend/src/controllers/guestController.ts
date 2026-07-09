import type { Request, Response } from 'express';
import { createGuest, listGuests, updateGuest } from '../services/guestService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listGuestsController(req: Request, res: Response) {
  const result = await listGuests(req);
  return ok(res, result.items, 'Guests loaded', result.meta);
}

export async function createGuestController(req: Request, res: Response) {
  const guest = await createGuest(req);
  return created(res, guest, 'Guest created');
}

export async function updateGuestController(req: Request, res: Response) {
  const guest = await updateGuest(req);
  return ok(res, guest, 'Guest updated');
}
