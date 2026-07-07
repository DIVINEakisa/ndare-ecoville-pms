import { Router } from 'express';
import {
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
  resetPasswordController
} from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema
} from '../validators/authValidators.js';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), asyncHandler(loginController));
authRoutes.post('/refresh', validate(refreshSchema), asyncHandler(refreshController));
authRoutes.post('/logout', validate(refreshSchema), asyncHandler(logoutController));
authRoutes.get('/me', authenticate, asyncHandler(meController));
authRoutes.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPasswordController));
authRoutes.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPasswordController));
