import { Router } from 'express';
import { listNotificationsController, markNotificationReadController } from '../controllers/notificationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { listNotificationsSchema, markNotificationReadSchema } from '../validators/notificationValidators.js';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate, attachPropertyScope);
notificationRoutes.get('/', authorizePermission('dashboard:read'), validate(listNotificationsSchema), asyncHandler(listNotificationsController));
notificationRoutes.patch('/:id/read', authorizePermission('dashboard:read'), validate(markNotificationReadSchema), asyncHandler(markNotificationReadController));
