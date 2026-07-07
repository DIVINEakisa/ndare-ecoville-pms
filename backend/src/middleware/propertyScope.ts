import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { globalRoles } from '../types/roles.js';
import { AppError } from '../utils/AppError.js';

export function attachPropertyScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');

  const isGlobal = globalRoles.includes(req.user.role);
  const requestedPropertyId = typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined;
  const activePropertyId = requestedPropertyId ?? req.user.activePropertyId;
  const assignedIds = req.user.assignedPropertyIds;

  if (!isGlobal && activePropertyId && !assignedIds.includes(activePropertyId)) {
    throw new AppError(403, 'You cannot access another property', 'PROPERTY_FORBIDDEN');
  }

  const scopedIds = isGlobal
    ? activePropertyId
      ? [activePropertyId]
      : []
    : activePropertyId
      ? [activePropertyId]
      : assignedIds;

  req.propertyScope = {
    isGlobal: isGlobal && !activePropertyId,
    propertyIds: scopedIds.map((id) => new Types.ObjectId(id)),
    activePropertyId: activePropertyId ? new Types.ObjectId(activePropertyId) : undefined
  };

  next();
}

export function propertyFilter(req: Request) {
  if (!req.propertyScope) throw new AppError(500, 'Property scope was not attached', 'PROPERTY_SCOPE_MISSING');
  if (req.propertyScope.isGlobal) return {};
  return { propertyId: { $in: req.propertyScope.propertyIds } };
}
