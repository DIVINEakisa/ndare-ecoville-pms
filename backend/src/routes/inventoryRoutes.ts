import { Router } from 'express';
import { adjustStockController, createInventoryItemController, listInventoryController } from '../controllers/inventoryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { createInventoryItemSchema, listInventorySchema, stockMovementSchema } from '../validators/inventoryValidators.js';

export const inventoryRoutes = Router();

inventoryRoutes.use(authenticate, attachPropertyScope);
inventoryRoutes.get('/', authorizePermission('inventory:read'), validate(listInventorySchema), asyncHandler(listInventoryController));
inventoryRoutes.post('/', authorizePermission('inventory:manage'), validate(createInventoryItemSchema), asyncHandler(createInventoryItemController));
inventoryRoutes.post('/:id/stock-movements', authorizePermission('inventory:manage'), validate(stockMovementSchema), asyncHandler(adjustStockController));
