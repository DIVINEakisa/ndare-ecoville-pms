import { Router } from 'express';
import {
  createReservationController,
  listReservationsController,
  updateReservationController
} from '../controllers/reservationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import {
  createReservationSchema,
  listReservationsSchema,
  updateReservationSchema
} from '../validators/reservationValidators.js';

export const reservationRoutes = Router();

reservationRoutes.use(authenticate, attachPropertyScope);
reservationRoutes.get('/', authorizePermission('reservations:manage'), validate(listReservationsSchema), asyncHandler(listReservationsController));
reservationRoutes.post('/', authorizePermission('reservations:manage'), validate(createReservationSchema), asyncHandler(createReservationController));
reservationRoutes.patch('/:id', authorizePermission('reservations:manage'), validate(updateReservationSchema), asyncHandler(updateReservationController));
