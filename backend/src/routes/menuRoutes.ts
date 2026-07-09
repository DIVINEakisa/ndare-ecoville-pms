import { Router } from 'express';
import {
  createMenuCategoryController,
  createMenuItemController,
  listMenuCategoriesController,
  listMenuItemsController
} from '../controllers/menuController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { createMenuCategorySchema, createMenuItemSchema, listMenuSchema } from '../validators/menuValidators.js';

export const menuRoutes = Router();

menuRoutes.use(authenticate, attachPropertyScope);
menuRoutes.get('/categories', authorizePermission('menu:read'), asyncHandler(listMenuCategoriesController));
menuRoutes.post('/categories', authorizePermission('menu:manage'), validate(createMenuCategorySchema), asyncHandler(createMenuCategoryController));
menuRoutes.get('/items', authorizePermission('menu:read'), validate(listMenuSchema), asyncHandler(listMenuItemsController));
menuRoutes.post('/items', authorizePermission('menu:manage'), validate(createMenuItemSchema), asyncHandler(createMenuItemController));
