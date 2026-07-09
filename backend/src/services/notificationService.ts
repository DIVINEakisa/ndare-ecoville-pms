import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { Notification } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

export async function createNotification(input: {
  propertyId: unknown;
  userId?: unknown;
  title: string;
  message: string;
  type?: 'Info' | 'Success' | 'Warning' | 'Danger';
  entityType?: string;
  entityId?: unknown;
  createdBy?: unknown;
}) {
  return Notification.create(input);
}

export async function listNotifications(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const unreadOnly = req.query.unreadOnly === 'true';
  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    $or: [{ userId: req.user?.id }, { userId: { $exists: false } }, { userId: null }],
    ...(unreadOnly ? { readAt: null } : {})
  };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null })
  ]);
  return { items, unread, meta: paginationMeta(page, limit, total) };
}

export async function markNotificationRead(req: Request) {
  const notification = await Notification.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!notification) throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  notification.readAt = new Date();
  await notification.save();
  return notification;
}
