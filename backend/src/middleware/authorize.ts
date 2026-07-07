import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type UserRole } from '../types/roles.js';
import { AppError } from '../utils/AppError.js';

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have access to this resource', 'FORBIDDEN');
    }
    next();
  };
}

export function authorizePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    if (!hasPermission(req.user.role, permission)) {
      throw new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN');
    }
    next();
  };
}
