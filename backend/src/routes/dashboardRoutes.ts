import { Router } from 'express';
import { dashboardSummaryController, ownerPortfolioController } from '../controllers/dashboardController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission, authorizeRoles } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate, attachPropertyScope);
dashboardRoutes.get('/summary', authorizePermission('dashboard:read'), asyncHandler(dashboardSummaryController));
dashboardRoutes.get('/portfolio', authorizeRoles('Owner', 'Admin'), asyncHandler(ownerPortfolioController));
