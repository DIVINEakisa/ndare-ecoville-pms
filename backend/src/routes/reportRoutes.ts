import { Router } from 'express';
import { reportsController } from '../controllers/reportController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { reportQuerySchema } from '../validators/reportValidators.js';

export const reportRoutes = Router();

reportRoutes.use(authenticate, attachPropertyScope);
reportRoutes.get('/', authorizePermission('reports:read'), validate(reportQuerySchema), asyncHandler(reportsController));
