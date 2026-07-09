import type { Request, Response } from 'express';
import { checkInReservation, checkOutReservation } from '../services/checkinService.js';
import { ok } from '../utils/apiResponse.js';

export async function checkInController(req: Request, res: Response) {
  const result = await checkInReservation(req);
  return ok(res, result, 'Guest checked in successfully');
}

export async function checkOutController(req: Request, res: Response) {
  const result = await checkOutReservation(req);
  return ok(res, result, 'Guest checked out successfully');
}
