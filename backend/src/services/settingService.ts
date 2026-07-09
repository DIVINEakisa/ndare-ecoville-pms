import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { Setting } from '../models/Setting.js';
import { AppError } from '../utils/AppError.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

export async function listSettings(req: Request) {
  return Setting.find({ ...propertyFilter(req), deletedAt: null }).sort({ key: 1 }).lean();
}

export async function upsertSetting(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  return Setting.findOneAndUpdate(
    { propertyId: req.body.propertyId, key: req.body.key },
    {
      propertyId: req.body.propertyId,
      key: req.body.key,
      value: req.body.value,
      description: req.body.description,
      updatedBy: req.user?.id,
      $setOnInsert: { createdBy: req.user?.id }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function listEmailTemplates(req: Request) {
  return EmailTemplate.find({ ...propertyFilter(req), deletedAt: null }).sort({ key: 1 }).lean();
}

export async function upsertEmailTemplate(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  return EmailTemplate.findOneAndUpdate(
    { propertyId: req.body.propertyId, key: req.body.key },
    { ...req.body, updatedBy: req.user?.id, $setOnInsert: { createdBy: req.user?.id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
