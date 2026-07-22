import { Router } from 'express';
import {
  getGuestHistoryController,
  getHistoryDetailController,
  getReceptionistsController,
  listHistoryController,
} from '../controllers/historyController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';

export const historyRoutes = Router();

historyRoutes.use(authenticate, attachPropertyScope);

// GET /history                — paginated list with summary
historyRoutes.get(
  '/',
  authorizePermission('reservations:manage'),
  asyncHandler(listHistoryController)
);

// GET /history/receptionists  — dropdown helper
historyRoutes.get(
  '/receptionists',
  authorizePermission('reservations:manage'),
  asyncHandler(getReceptionistsController)
);

// GET /history/guest/:guestId — guest stay history
historyRoutes.get(
  '/guest/:guestId',
  authorizePermission('reservations:manage'),
  asyncHandler(getGuestHistoryController)
);

// GET /history/:id            — single reservation detail
historyRoutes.get(
  '/:id',
  authorizePermission('reservations:manage'),
  asyncHandler(getHistoryDetailController)
);
