import type { Request, Response } from 'express';
import { Property } from '../models/Property.js';
import { ok } from '../utils/apiResponse.js';

export async function listPropertiesController(req: Request, res: Response) {
  const filter = req.propertyScope?.isGlobal ? {} : { _id: { $in: req.propertyScope?.propertyIds ?? [] } };
  const properties = await Property.find({ ...filter, deletedAt: null, isActive: true })
    .select('name code roomCount currency timezone')
    .sort({ name: 1 })
    .lean();

  return ok(res, properties, 'Properties loaded');
}
