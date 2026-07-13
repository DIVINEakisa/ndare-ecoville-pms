import type { Request, Response } from 'express';
import { AUDIT_ACTIONS } from '../models/AuditLog.js';
import { listAuditLogs } from '../services/auditService.js';
import { ok } from '../utils/apiResponse.js';
import { userRoles } from '../types/roles.js';

export async function listAuditLogsController(req: Request, res: Response) {
  const {
    page, limit, action, role, userId,
    dateFrom, dateTo, search
  } = req.query as Record<string, string | undefined>;

  const result = await listAuditLogs({
    page:     page     ? parseInt(page)     : 1,
    limit:    limit    ? Math.min(parseInt(limit), 200) : 50,
    action:   action   as Parameters<typeof listAuditLogs>[0]['action'],
    role:     role     as string | undefined,
    userId:   userId   as string | undefined,
    dateFrom: dateFrom as string | undefined,
    dateTo:   dateTo   as string | undefined,
    search:   search   as string | undefined,
  });

  return ok(res, result.logs, 'Audit logs loaded', result.meta);
}

/** Return the enums the frontend needs for its filter dropdowns. */
export async function getAuditMetaController(_req: Request, res: Response) {
  return ok(res, {
    actions: AUDIT_ACTIONS,
    roles:   userRoles,
  }, 'Audit meta loaded');
}
