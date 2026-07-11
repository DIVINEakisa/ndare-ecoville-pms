import type { Request, Response } from 'express';
import {
  getPublicMenu,
  getPublicOrderStatus,
  placePublicOrder
} from '../services/publicOrderService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function publicMenuController(req: Request, res: Response) {
  const data = await getPublicMenu(req.params.propertyId);
  return ok(res, data, 'Menu loaded');
}

export async function placePublicOrderController(req: Request, res: Response) {
  const order = await placePublicOrder({
    propertyId:     req.params.propertyId,
    guestName:      req.body.guestName,
    locationType:   req.body.locationType,
    locationNumber: req.body.locationNumber,
    notes:          req.body.notes,
    items:          req.body.items
  });
  return created(res, order, 'Order placed successfully');
}

export async function publicOrderStatusController(req: Request, res: Response) {
  const order = await getPublicOrderStatus(req.params.orderId);
  return ok(res, order, 'Order status loaded');
}
