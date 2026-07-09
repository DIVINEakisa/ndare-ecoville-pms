import { Router } from 'express';
import { createGuestController, listGuestsController, updateGuestController } from '../controllers/guestController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { createGuestSchema, listGuestsSchema, updateGuestSchema } from '../validators/guestValidators.js';

export const guestRoutes = Router();

guestRoutes.use(authenticate, attachPropertyScope);
guestRoutes.get('/', authorizePermission('guests:manage'), validate(listGuestsSchema), asyncHandler(listGuestsController));
guestRoutes.post('/', authorizePermission('guests:manage'), validate(createGuestSchema), asyncHandler(createGuestController));
guestRoutes.patch('/:id', authorizePermission('guests:manage'), validate(updateGuestSchema), asyncHandler(updateGuestController));
