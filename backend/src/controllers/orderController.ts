import type { Request, Response } from 'express';
import { createOrder, createPortalOrder, listOrders, updateOrderStatus } from '../services/orderService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listOrdersController(req: Request, res: Response) {
  const result = await listOrders(req);
  return ok(res, result.items, 'Restaurant orders loaded', result.meta);
}

export async function createOrderController(req: Request, res: Response) {
  const order = await createOrder(req);
  return created(res, order, 'Restaurant order created');
}

export async function updateOrderStatusController(req: Request, res: Response) {
  const order = await updateOrderStatus(req);
  return ok(res, order, 'Order status updated');
}

export async function createPortalOrderController(req: Request, res: Response) {
  const order = await createPortalOrder({
    propertyId: req.params.propertyId,
    roomId: req.params.roomId,
    items: req.body.items
  });
  return created(res, order, 'Order sent to kitchen');
}
