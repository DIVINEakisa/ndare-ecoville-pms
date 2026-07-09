import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { createNotification } from './notificationService.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

async function notifyLowStock(item: { _id: unknown; propertyId: unknown; name: string; quantityOnHand: number; lowStockThreshold: number }, createdBy?: string) {
  if (item.quantityOnHand <= item.lowStockThreshold) {
    await createNotification({
      propertyId: item.propertyId,
      title: 'Low stock alert',
      message: `${item.name} is at or below its low stock threshold.`,
      type: 'Warning',
      entityType: 'InventoryItem',
      entityId: item._id,
      createdBy
    });
  }
}

export async function listInventory(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const lowStock = req.query.lowStock === 'true';
  const filter = {
    ...propertyFilter(req),
    deletedAt: null,
    isActive: true,
    ...(category ? { category } : {}),
    ...(search ? { name: { $regex: search, $options: 'i' } } : {}),
    ...(lowStock ? { $expr: { $lte: ['$quantityOnHand', '$lowStockThreshold'] } } : {})
  };
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit).lean(),
    InventoryItem.countDocuments(filter)
  ]);
  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createInventoryItem(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  const item = await InventoryItem.create({ ...req.body, createdBy: req.user?.id });
  await StockMovement.create({
    propertyId: item.get('propertyId'),
    inventoryItemId: item._id,
    type: 'Purchase',
    quantity: item.quantityOnHand,
    previousQuantity: 0,
    nextQuantity: item.quantityOnHand,
    notes: 'Initial stock',
    createdBy: req.user?.id
  });
  await notifyLowStock(item as never, req.user?.id);
  return item;
}

export async function adjustStock(req: Request) {
  const item = await InventoryItem.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!item) throw new AppError(404, 'Inventory item not found', 'INVENTORY_ITEM_NOT_FOUND');
  const previousQuantity = item.quantityOnHand;
  const delta = req.body.type === 'Purchase' ? Math.abs(req.body.quantity) : req.body.type === 'Issue' ? -Math.abs(req.body.quantity) : req.body.quantity;
  const nextQuantity = previousQuantity + delta;
  if (nextQuantity < 0) throw new AppError(422, 'Stock quantity cannot go below zero', 'NEGATIVE_STOCK');
  item.quantityOnHand = nextQuantity;
  item.set('updatedBy', req.user?.id);
  await item.save();
  await StockMovement.create({
    propertyId: item.get('propertyId'),
    inventoryItemId: item._id,
    type: req.body.type,
    quantity: delta,
    previousQuantity,
    nextQuantity,
    notes: req.body.notes,
    createdBy: req.user?.id
  });
  await notifyLowStock(item as never, req.user?.id);
  return item;
}
