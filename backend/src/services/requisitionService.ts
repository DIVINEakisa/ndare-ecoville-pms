import type { Request } from 'express';
import { Types } from 'mongoose';
import { propertyFilter } from '../middleware/propertyScope.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Requisition } from '../models/Requisition.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { createNotification } from './notificationService.js';

function assertPropertyAccess(req: Request, propertyId: string) {
  if (req.propertyScope?.isGlobal) return;
  const allowed = req.propertyScope?.propertyIds.some((id) => String(id) === propertyId);
  if (!allowed) throw new AppError(403, 'You cannot manage another property', 'PROPERTY_FORBIDDEN');
}

async function nextRequestNumber(propertyId: string) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Requisition.countDocuments({
    propertyId: new Types.ObjectId(propertyId),
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  return `REQ-${today}-${String(count + 1).padStart(4, '0')}`;
}

export async function listRequisitions(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const filter = { ...propertyFilter(req), deletedAt: null, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    Requisition.find(filter).populate('requestedBy', 'fullName role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Requisition.countDocuments(filter)
  ]);
  return { items, meta: paginationMeta(page, limit, total) };
}

export async function createRequisition(req: Request) {
  assertPropertyAccess(req, req.body.propertyId);
  const itemIds = req.body.items.map((item: { inventoryItemId: string }) => item.inventoryItemId);
  const inventoryItems = await InventoryItem.find({
    _id: { $in: itemIds },
    propertyId: req.body.propertyId,
    deletedAt: null,
    isActive: true
  }).lean();
  if (inventoryItems.length !== itemIds.length) {
    throw new AppError(422, 'One or more inventory items are invalid', 'INVALID_REQUISITION_ITEM');
  }
  const items = req.body.items.map((item: { inventoryItemId: string; quantity: number }) => {
    const inventory = inventoryItems.find((candidate) => String(candidate._id) === item.inventoryItemId);
    if (!inventory) throw new AppError(422, 'Inventory item is invalid', 'INVALID_REQUISITION_ITEM');
    return {
      inventoryItemId: inventory._id,
      name: inventory.name,
      quantity: item.quantity,
      unit: inventory.unit
    };
  });
  const requisition = await Requisition.create({
    propertyId: req.body.propertyId,
    requestNumber: await nextRequestNumber(req.body.propertyId),
    department: req.body.department,
    requestedBy: req.user?.id,
    items,
    notes: req.body.notes,
    createdBy: req.user?.id
  });
  await createNotification({
    propertyId: req.body.propertyId,
    title: 'New requisition pending',
    message: `${requisition.requestNumber} is waiting for approval.`,
    type: 'Info',
    entityType: 'Requisition',
    entityId: requisition._id,
    createdBy: req.user?.id
  });
  return requisition;
}

export async function approveRequisition(req: Request) {
  const requisition = await Requisition.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!requisition) throw new AppError(404, 'Requisition not found', 'REQUISITION_NOT_FOUND');
  if (requisition.status !== 'Pending') throw new AppError(422, 'Only pending requisitions can be approved', 'INVALID_REQUISITION_STATUS');
  requisition.status = 'Approved';
  requisition.approval = { approvedBy: new Types.ObjectId(req.user?.id), approvedAt: new Date(), reason: req.body.reason };
  requisition.set('updatedBy', req.user?.id);
  await requisition.save();
  await createNotification({
    propertyId: requisition.get('propertyId'),
    userId: requisition.requestedBy,
    title: 'Requisition approved',
    message: `${requisition.requestNumber} has been approved.`,
    type: 'Success',
    entityType: 'Requisition',
    entityId: requisition._id,
    createdBy: req.user?.id
  });
  return requisition;
}

export async function rejectRequisition(req: Request) {
  const requisition = await Requisition.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!requisition) throw new AppError(404, 'Requisition not found', 'REQUISITION_NOT_FOUND');
  if (requisition.status !== 'Pending') throw new AppError(422, 'Only pending requisitions can be rejected', 'INVALID_REQUISITION_STATUS');
  requisition.status = 'Rejected';
  requisition.approval = { rejectedBy: new Types.ObjectId(req.user?.id), rejectedAt: new Date(), reason: req.body.reason };
  requisition.set('updatedBy', req.user?.id);
  await requisition.save();
  await createNotification({
    propertyId: requisition.get('propertyId'),
    userId: requisition.requestedBy,
    title: 'Requisition rejected',
    message: `${requisition.requestNumber} was rejected.`,
    type: 'Danger',
    entityType: 'Requisition',
    entityId: requisition._id,
    createdBy: req.user?.id
  });
  return requisition;
}

export async function receiveRequisition(req: Request) {
  const requisition = await Requisition.findOne({ ...propertyFilter(req), _id: req.params.id, deletedAt: null });
  if (!requisition) throw new AppError(404, 'Requisition not found', 'REQUISITION_NOT_FOUND');
  if (requisition.status !== 'Approved') throw new AppError(422, 'Only approved requisitions can be received', 'INVALID_REQUISITION_STATUS');

  for (const item of requisition.items) {
    const inventory = await InventoryItem.findOne({ _id: item.inventoryItemId, propertyId: requisition.get('propertyId'), deletedAt: null });
    if (!inventory) throw new AppError(404, `Inventory item ${item.name} not found`, 'INVENTORY_ITEM_NOT_FOUND');
    const previousQuantity = inventory.quantityOnHand;
    const nextQuantity = previousQuantity - item.quantity;
    if (nextQuantity < 0) throw new AppError(422, `${item.name} does not have enough stock`, 'INSUFFICIENT_STOCK');
    inventory.quantityOnHand = nextQuantity;
    await inventory.save();
    await StockMovement.create({
      propertyId: requisition.get('propertyId'),
      inventoryItemId: inventory._id,
      type: 'Requisition',
      quantity: -item.quantity,
      previousQuantity,
      nextQuantity,
      referenceType: 'Requisition',
      referenceId: requisition._id,
      notes: requisition.requestNumber,
      createdBy: req.user?.id
    });
  }

  requisition.status = 'Received';
  requisition.receivedBy = new Types.ObjectId(req.user?.id);
  requisition.receivedAt = new Date();
  requisition.set('updatedBy', req.user?.id);
  await requisition.save();
  await createNotification({
    propertyId: requisition.get('propertyId'),
    userId: requisition.requestedBy,
    title: 'Requisition received',
    message: `${requisition.requestNumber} has been received and issued from stock.`,
    type: 'Success',
    entityType: 'Requisition',
    entityId: requisition._id,
    createdBy: req.user?.id
  });
  return requisition;
}
