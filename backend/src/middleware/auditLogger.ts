import type { NextFunction, Request, Response } from 'express';
import { AuditLog, type AuditAction } from '../models/AuditLog.js';

/**
 * auditLogger — drop-in Express middleware that writes an AuditLog entry
 * after every successful mutating request (POST / PUT / PATCH / DELETE).
 *
 * Usage:
 *   router.post('/rooms', authenticate, auditLogger('CREATE_ROOM', 'Room'), asyncHandler(createRoom));
 *
 * The write is fire-and-forget so it NEVER delays the HTTP response.
 */
export function auditLogger(
  action: AuditAction,
  resourceLabel: string,
  getDescription?: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Intercept res.json so we can inspect the status code after the handler runs
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log successful mutations
      if (res.statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const user = req.user;

        const description =
          getDescription?.(req) ??
          buildDescription(req, action, resourceLabel);

        const ip =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
          req.socket?.remoteAddress ??
          'unknown';

        // Fire-and-forget — never block the response
        AuditLog.create({
          performedBy: user
            ? {
                userId: user.id,
                name:   user.fullName,
                role:   user.role,
                email:  user.email
              }
            : { name: 'System', role: 'System' },
          action,
          resource:    resourceLabel,
          description,
          ipAddress:   ip,
          metadata: {
            method:  req.method,
            path:    req.originalUrl,
            params:  req.params,
          }
        }).catch((err: Error) =>
          console.error('[AuditLog] Write failed:', err.message)
        );
      }

      return originalJson(body);
    };

    next();
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildDescription(req: Request, action: AuditAction, resource: string): string {
  const who  = req.user?.fullName ?? 'Unknown user';
  const role = req.user?.role     ?? 'Unknown role';
  const id   = req.params?.id     ?? '';

  const map: Partial<Record<AuditAction, string>> = {
    CREATE_RESERVATION: `${who} (${role}) created a new reservation`,
    UPDATE_RESERVATION: `${who} (${role}) updated reservation ${id}`,
    CANCEL_RESERVATION: `${who} (${role}) cancelled reservation ${id}`,
    CHECK_IN:           `${who} (${role}) checked in a guest`,
    CHECK_OUT:          `${who} (${role}) checked out a guest`,
    CREATE_ROOM:        `${who} (${role}) created a new room`,
    UPDATE_ROOM:        `${who} (${role}) updated room ${id}`,
    DELETE_ROOM:        `${who} (${role}) deleted room ${id}`,
    CREATE_GUEST:       `${who} (${role}) created guest profile`,
    UPDATE_GUEST:       `${who} (${role}) updated guest ${id}`,
    DELETE_GUEST:       `${who} (${role}) deleted guest ${id}`,
    CREATE_USER:        `${who} (${role}) created a new staff account`,
    UPDATE_USER:        `${who} (${role}) updated user ${id}`,
    DEACTIVATE_USER:    `${who} (${role}) deactivated user ${id}`,
    REACTIVATE_USER:    `${who} (${role}) reactivated user ${id}`,
    CREATE_ORDER:       `${who} (${role}) placed a new restaurant order`,
    UPDATE_ORDER_STATUS:`${who} (${role}) updated order status for ${id}`,
    CANCEL_ORDER:       `${who} (${role}) cancelled order ${id}`,
    CREATE_MENU_ITEM:   `${who} (${role}) added a new menu item`,
    UPDATE_MENU_ITEM:   `${who} (${role}) updated menu item ${id}`,
    DELETE_MENU_ITEM:   `${who} (${role}) deleted menu item ${id}`,
    SETTLE_PAYMENT:     `${who} (${role}) recorded a payment on folio ${id}`,
    CREATE_REQUISITION: `${who} (${role}) submitted a new requisition`,
    APPROVE_REQUISITION:`${who} (${role}) approved requisition ${id}`,
    UPDATE_SETTINGS:    `${who} (${role}) updated system settings`,
    LOGIN_SUCCESS:      `${who} signed in successfully`,
    LOGOUT:             `${who} signed out`,
  };

  return map[action] ?? `${who} (${role}) performed ${action} on ${resource}`;
}
