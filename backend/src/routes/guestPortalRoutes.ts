import { Router } from 'express';
import { guestPortalContextController } from '../controllers/guestPortalController.js';
import { createPortalOrderController } from '../controllers/orderController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { guestPortalContextSchema, guestPortalOrderSchema } from '../validators/guestPortalValidators.js';

export const guestPortalRoutes = Router();

guestPortalRoutes.get('/:propertyId/:roomId', validate(guestPortalContextSchema), asyncHandler(guestPortalContextController));
guestPortalRoutes.post('/:propertyId/:roomId/orders', validate(guestPortalOrderSchema), asyncHandler(createPortalOrderController));
