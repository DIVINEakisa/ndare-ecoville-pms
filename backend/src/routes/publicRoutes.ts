import { Router } from 'express';
import {
  listPublicOrdersController,
  placePublicOrderController,
  publicMenuController,
  publicOrderStatusController,
  updatePublicOrderStatusController
} from '../controllers/publicOrderController.js';
import { asyncHandler }  from '../middleware/asyncHandler.js';
import { authenticate }  from '../middleware/authenticate.js';
import { validate }      from '../middleware/validate.js';
import {
  placePublicOrderSchema,
  publicMenuSchema,
  publicOrderStatusSchema,
  publicOrderUpdateSchema,
  publicQueueSchema
} from '../validators/publicOrderValidators.js';

export const publicRoutes = Router();

// ── Guest-facing (no auth) ────────────────────────────────────────────────────
// GET  /api/public/:propertyId/menu
// POST /api/public/:propertyId/orders
// GET  /api/public/orders/:orderId/status

publicRoutes.get(
  '/:propertyId/menu',
  validate(publicMenuSchema),
  asyncHandler(publicMenuController)
);

publicRoutes.post(
  '/:propertyId/orders',
  validate(placePublicOrderSchema),
  asyncHandler(placePublicOrderController)
);

publicRoutes.get(
  '/orders/:orderId/status',
  validate(publicOrderStatusSchema),
  asyncHandler(publicOrderStatusController)
);

// ── Staff-facing (auth required) ──────────────────────────────────────────────
// GET   /api/public/:propertyId/queue          — list active walk-in orders
// PATCH /api/public/orders/:orderId/status     — advance order status

publicRoutes.get(
  '/:propertyId/queue',
  authenticate,
  validate(publicQueueSchema),
  asyncHandler(listPublicOrdersController)
);

publicRoutes.patch(
  '/orders/:orderId/status',
  authenticate,
  validate(publicOrderUpdateSchema),
  asyncHandler(updatePublicOrderStatusController)
);
