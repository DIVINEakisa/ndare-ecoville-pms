import type { Request, Response } from 'express';
import { getGuestPortalContext } from '../services/guestPortalService.js';
import { ok } from '../utils/apiResponse.js';

export async function guestPortalContextController(req: Request, res: Response) {
  const context = await getGuestPortalContext(req.params.propertyId, req.params.roomId);
  return ok(res, context, 'Guest portal loaded');
}
