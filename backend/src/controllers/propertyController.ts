import type { Request, Response } from 'express';
import { globalRoles } from '../types/roles.js';
import { Property } from '../models/Property.js';
import { ok } from '../utils/apiResponse.js';

export async function listPropertiesController(req: Request, res: Response) {
  // Owners and Admins always see all active properties regardless of
  // what assignedPropertyIds is stored in their session token
  const isGlobalRole = req.user?.role && globalRoles.includes(req.user.role);
  const filter = isGlobalRole
    ? {}
    : { _id: { $in: req.propertyScope?.propertyIds ?? [] } };

  const properties = await Property.find({ ...filter, deletedAt: null, isActive: true })
    .select('name code roomCount currency timezone')
    .sort({ name: 1 })
    .lean();

  return ok(res, properties, 'Properties loaded');
}
