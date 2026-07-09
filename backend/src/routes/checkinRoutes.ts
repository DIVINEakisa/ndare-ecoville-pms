import { Router } from 'express';
import { checkInController, checkOutController } from '../controllers/checkinController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { checkInSchema, checkOutSchema } from '../validators/checkinValidators.js';

export const checkinRoutes = Router();
export const checkoutRoutes = Router();

checkinRoutes.use(authenticate, attachPropertyScope);
checkinRoutes.post('/', authorizePermission('reservations:manage'), validate(checkInSchema), asyncHandler(checkInController));

checkoutRoutes.use(authenticate, attachPropertyScope);
checkoutRoutes.post('/', authorizePermission('folios:manage'), validate(checkOutSchema), asyncHandler(checkOutController));
