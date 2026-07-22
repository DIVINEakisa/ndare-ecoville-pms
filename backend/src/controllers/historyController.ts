import type { Request, Response } from 'express';
import {
  getGuestHistory,
  getHistoryDetail,
  getReceptionists,
  listHistory,
} from '../services/historyService.js';
import { ok } from '../utils/apiResponse.js';

export async function listHistoryController(req: Request, res: Response) {
  const result = await listHistory(req);
  // Return items as data and inject summary into the top-level response
  const meta = { ...result.meta, summary: result.summary };
  return ok(res, result.items, 'History loaded', meta as Parameters<typeof ok>[3]);
}

export async function getHistoryDetailController(req: Request, res: Response) {
  const result = await getHistoryDetail(req);
  return ok(res, result, 'History detail loaded');
}

export async function getGuestHistoryController(req: Request, res: Response) {
  const result = await getGuestHistory(req);
  return ok(res, result, 'Guest history loaded');
}

export async function getReceptionistsController(req: Request, res: Response) {
  const result = await getReceptionists(req);
  return ok(res, result, 'Receptionists loaded');
}
