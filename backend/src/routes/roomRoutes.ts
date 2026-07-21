import { Router } from 'express';
import { availabilityController, createRoomController, listRoomsController, updateRoomController } from '../controllers/roomController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { availabilitySchema } from '../validators/reservationValidators.js';
import { createRoomSchema, listRoomsSchema, updateRoomSchema } from '../validators/roomValidators.js';

export const roomRoutes = Router();

roomRoutes.use(authenticate, attachPropertyScope);
roomRoutes.get('/', authorizePermission('rooms:read'), validate(listRoomsSchema), asyncHandler(listRoomsController));
roomRoutes.get('/availability', authorizePermission('reservations:manage'), validate(availabilitySchema), asyncHandler(availabilityController));
roomRoutes.post('/', authorizePermission('rooms:manage'), validate(createRoomSchema), asyncHandler(createRoomController));
// rooms:manage is granted to Owner, Admin, Property Manager, AND Housekeeper.
// The service layer restricts Housekeepers to status-only changes.
roomRoutes.patch('/:id', authorizePermission('rooms:manage'), validate(updateRoomSchema), asyncHandler(updateRoomController));
