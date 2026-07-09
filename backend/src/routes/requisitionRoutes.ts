import { Router } from 'express';
import {
  approveRequisitionController,
  createRequisitionController,
  listRequisitionsController,
  receiveRequisitionController,
  rejectRequisitionController
} from '../controllers/requisitionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizePermission } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import {
  createRequisitionSchema,
  listRequisitionsSchema,
  requisitionDecisionSchema
} from '../validators/requisitionValidators.js';

export const requisitionRoutes = Router();

requisitionRoutes.use(authenticate, attachPropertyScope);
requisitionRoutes.get('/', authorizePermission('requisitions:create'), validate(listRequisitionsSchema), asyncHandler(listRequisitionsController));
requisitionRoutes.post('/', authorizePermission('requisitions:create'), validate(createRequisitionSchema), asyncHandler(createRequisitionController));
requisitionRoutes.post('/:id/approve', authorizePermission('requisitions:approve'), validate(requisitionDecisionSchema), asyncHandler(approveRequisitionController));
requisitionRoutes.post('/:id/reject', authorizePermission('requisitions:approve'), validate(requisitionDecisionSchema), asyncHandler(rejectRequisitionController));
requisitionRoutes.post('/:id/receive', authorizePermission('requisitions:receive'), validate(requisitionDecisionSchema), asyncHandler(receiveRequisitionController));
