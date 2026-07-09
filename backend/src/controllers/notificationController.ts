import type { Request, Response } from 'express';
import { listNotifications, markNotificationRead } from '../services/notificationService.js';
import { ok } from '../utils/apiResponse.js';

export async function listNotificationsController(req: Request, res: Response) {
  const result = await listNotifications(req);
  return ok(res, { items: result.items, unread: result.unread }, 'Notifications loaded', result.meta);
}

export async function markNotificationReadController(req: Request, res: Response) {
  const notification = await markNotificationRead(req);
  return ok(res, notification, 'Notification marked as read');
}
