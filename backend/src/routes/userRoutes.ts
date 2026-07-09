import { Router } from 'express';
import { createUserController, listUsersController } from '../controllers/userController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema } from '../validators/userValidators.js';

export const userRoutes = Router();

userRoutes.use(authenticate, authorizeRoles('Owner'));
userRoutes.get('/', asyncHandler(listUsersController));
userRoutes.post('/', validate(createUserSchema), asyncHandler(createUserController));
