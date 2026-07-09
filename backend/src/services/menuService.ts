import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { MenuCategory } from '../models/MenuCategory.js';
import { MenuItem } from '../models/MenuItem.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

export async function listCategories(req: Request) {
  return MenuCategory.find({ ...propertyFilter(req), deletedAt: null, isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
}

export async function createCategory(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  return MenuCategory.create({ ...req.body, createdBy: req.user?.id });
}

export async function listMenuItems(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : '';
  const availableOnly = req.query.availableOnly === 'true';
  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    isActive: true,
    ...(availableOnly ? { isAvailable: true } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(search ? { name: { $regex: search, $options: 'i' } } : {})
  };
  const [items, total] = await Promise.all([
    MenuItem.find(filter).populate('categoryId', 'name').sort({ name: 1 }).skip(skip).limit(limit).lean(),
    MenuItem.countDocuments(filter)
  ]);
  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createMenuItem(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  const category = await MenuCategory.exists({ _id: req.body.categoryId, propertyId: req.body.propertyId, deletedAt: null });
  if (!category) throw new AppError(404, 'Menu category not found for selected property', 'MENU_CATEGORY_NOT_FOUND');
  return MenuItem.create({ ...req.body, createdBy: req.user?.id });
}
