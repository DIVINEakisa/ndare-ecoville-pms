import { Router } from 'express';
import { listPropertiesController } from '../controllers/propertyController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';

export const propertyRoutes = Router();

propertyRoutes.use(authenticate, attachPropertyScope);
propertyRoutes.get('/', authorizePermission('dashboard:read'), asyncHandler(listPropertiesController));
