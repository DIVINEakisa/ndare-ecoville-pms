import { Router } from 'express';
import {
  listEmailTemplatesController,
  listSettingsController,
  upsertEmailTemplateController,
  upsertSettingController
} from '../controllers/settingController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';
import { attachPropertyScope } from '../middleware/propertyScope.js';
import { validate } from '../middleware/validate.js';
import { emailTemplateSchema, listSettingsSchema, upsertSettingSchema } from '../validators/settingValidators.js';

export const settingRoutes = Router();

settingRoutes.use(authenticate, attachPropertyScope);
settingRoutes.get('/', authorizeRoles('Owner', 'Admin', 'Property Manager'), validate(listSettingsSchema), asyncHandler(listSettingsController));
settingRoutes.post('/', authorizeRoles('Owner', 'Admin', 'Property Manager'), validate(upsertSettingSchema), asyncHandler(upsertSettingController));
settingRoutes.get('/email-templates', authorizeRoles('Owner', 'Admin', 'Property Manager'), asyncHandler(listEmailTemplatesController));
settingRoutes.post('/email-templates', authorizeRoles('Owner', 'Admin', 'Property Manager'), validate(emailTemplateSchema), asyncHandler(upsertEmailTemplateController));
