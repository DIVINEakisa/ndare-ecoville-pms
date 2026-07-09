import { Router } from 'express';
import { getFolioController, listFoliosController, postFolioPaymentController } from '../controllers/folioController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { folioPaymentSchema, getFolioSchema, listFoliosSchema } from '../validators/folioValidators.js';

export const folioRoutes = Router();

folioRoutes.use(authenticate, attachPropertyScope);
folioRoutes.get('/', authorizePermission('folios:read'), validate(listFoliosSchema), asyncHandler(listFoliosController));
folioRoutes.get('/:id', authorizePermission('folios:read'), validate(getFolioSchema), asyncHandler(getFolioController));
folioRoutes.post('/:id/payments', authorizePermission('payments:create'), validate(folioPaymentSchema), asyncHandler(postFolioPaymentController));
