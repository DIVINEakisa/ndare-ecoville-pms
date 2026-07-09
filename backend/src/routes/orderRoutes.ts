import { Router } from 'express';
import { createOrderController, listOrdersController, updateOrderStatusController } from '../controllers/orderController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, listOrdersSchema, updateOrderStatusSchema } from '../validators/orderValidators.js';

export const orderRoutes = Router();

orderRoutes.use(authenticate, attachPropertyScope);
orderRoutes.get('/', authorizePermission('orders:manage'), validate(listOrdersSchema), asyncHandler(listOrdersController));
orderRoutes.post('/', authorizePermission('orders:manage'), validate(createOrderSchema), asyncHandler(createOrderController));
orderRoutes.patch('/:id/status', authorizePermission('orders:manage'), validate(updateOrderStatusSchema), asyncHandler(updateOrderStatusController));
