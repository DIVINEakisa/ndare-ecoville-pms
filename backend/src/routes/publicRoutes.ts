import { Router } from 'express';
import {
  placePublicOrderController,
  publicMenuController,
  publicOrderStatusController
} from '../controllers/publicOrderController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate }     from '../middleware/validate.js';
import {
  placePublicOrderSchema,
  publicMenuSchema,
  publicOrderStatusSchema
} from '../validators/publicOrderValidators.js';

/**
 * Public routes — no authentication required.
 * Rate limiting is inherited from the global limiter in app.ts.
 */
export const publicRoutes = Router();

// GET  /api/public/:propertyId/menu        — fetch available menu for the QR page
// POST /api/public/:propertyId/orders      — place a walk-in / table order
// GET  /api/public/orders/:orderId/status  — poll order status after placement

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
