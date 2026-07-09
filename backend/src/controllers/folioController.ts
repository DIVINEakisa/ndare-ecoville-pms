import type { Request, Response } from 'express';
import { getFolio, listFolios, postFolioPayment } from '../services/folioService.js';
import { ok } from '../utils/apiResponse.js';

export async function listFoliosController(req: Request, res: Response) {
  const result = await listFolios(req);
  return ok(res, result.items, 'Folios loaded', result.meta);
}

export async function getFolioController(req: Request, res: Response) {
  const result = await getFolio(req);
  return ok(res, result, 'Folio loaded');
}

export async function postFolioPaymentController(req: Request, res: Response) {
  const folio = await postFolioPayment(req);
  return ok(res, folio, 'Payment posted');
}
