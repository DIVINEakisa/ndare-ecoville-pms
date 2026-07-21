import { Router } from 'express';
import {
  createUserController,
  deleteUserController,
  listUsersController,
  toggleUserStatusController
} from '../controllers/userController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, userIdSchema } from '../validators/userValidators.js';

export const userRoutes = Router();

userRoutes.use(authenticate, authorizeRoles('Owner'));

userRoutes.get('/',   asyncHandler(listUsersController));
userRoutes.post('/',  validate(createUserSchema), asyncHandler(createUserController));
userRoutes.patch('/:id/toggle-status', validate(userIdSchema), asyncHandler(toggleUserStatusController));
userRoutes.delete('/:id', validate(userIdSchema), asyncHandler(deleteUserController));
