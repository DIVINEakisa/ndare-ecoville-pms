import type { Request, Response } from 'express';
import { listEmailTemplates, listSettings, upsertEmailTemplate, upsertSetting } from '../services/settingService.js';
import { ok } from '../utils/apiResponse.js';

export async function listSettingsController(req: Request, res: Response) {
  const settings = await listSettings(req);
  return ok(res, settings, 'Settings loaded');
}

export async function upsertSettingController(req: Request, res: Response) {
  const setting = await upsertSetting(req);
  return ok(res, setting, 'Setting saved');
}

export async function listEmailTemplatesController(req: Request, res: Response) {
  const templates = await listEmailTemplates(req);
  return ok(res, templates, 'Email templates loaded');
}

export async function upsertEmailTemplateController(req: Request, res: Response) {
  const template = await upsertEmailTemplate(req);
  return ok(res, template, 'Email template saved');
}
