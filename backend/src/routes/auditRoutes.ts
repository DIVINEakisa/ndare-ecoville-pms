import { Router } from 'express';
import {
  getAuditMetaController,
  listAuditLogsController
} from '../controllers/auditController.js';
import { asyncHandler }  from '../middleware/asyncHandler.js';
import { authenticate }  from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

export const auditRoutes = Router();

// Both endpoints are strictly Owner-only — audit logs are never exposed to
// other roles regardless of any other permission.
auditRoutes.use(authenticate, authorizeRoles('Owner'));

auditRoutes.get('/',     asyncHandler(listAuditLogsController));
auditRoutes.get('/meta', asyncHandler(getAuditMetaController));
