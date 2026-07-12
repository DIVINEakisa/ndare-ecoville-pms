import mongoose from 'mongoose';
import { MenuCategory } from '../models/MenuCategory.js';
import { MenuItem }     from '../models/MenuItem.js';
import { Property }     from '../models/Property.js';
import { PublicOrder }  from '../models/PublicOrder.js';
import { User }         from '../models/User.js';
import { createNotification } from './notificationService.js';
import { AppError }     from '../utils/AppError.js';

// ─── menu ─────────────────────────────────────────────────────────────────────

export async function getPublicMenu(propertyId: string) {
  const property = await Property.findOne({
    _id: propertyId,
    isActive: true,
    deletedAt: null
  }).select('name code').lean();

  if (!property) throw new AppError(404, 'Property not found', 'PROPERTY_NOT_FOUND');

  const [categories, items] = await Promise.all([
    MenuCategory.find({ propertyId, isActive: true, deletedAt: null })
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    MenuItem.find({ propertyId, isActive: true, isAvailable: true, deletedAt: null })
      .select('name description price preparationMinutes categoryId imageUrl')
      .sort({ name: 1 })
      .lean()
  ]);

  return {
    property,
    menu: categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => String(item.categoryId) === String(cat._id))
    }))
  };
}

// ─── order ────────────────────────────────────────────────────────────────────

type PlaceOrderInput = {
  propertyId:     string;
  guestName:      string;
  locationType:   'room' | 'table';
  locationNumber: string;
  notes?:         string;
  items: Array<{
    menuItemId: string;
    quantity:   number;
  }>;
};

export async function placePublicOrder(input: PlaceOrderInput) {
  // Validate property exists
  const property = await Property.exists({ _id: input.propertyId, isActive: true, deletedAt: null });
  if (!property) throw new AppError(404, 'Property not found', 'PROPERTY_NOT_FOUND');

  // Resolve menu items from DB to get authoritative prices (never trust client prices)
  const itemIds = input.items.map((i) => new mongoose.Types.ObjectId(i.menuItemId));
  const menuItems = await MenuItem.find({
    _id: { $in: itemIds },
    propertyId: input.propertyId,
    isActive: true,
    isAvailable: true,
    deletedAt: null
  }).lean();

  if (menuItems.length === 0) {
    throw new AppError(400, 'No valid menu items found', 'INVALID_ITEMS');
  }

  const menuMap = new Map(menuItems.map((m) => [String(m._id), m]));

  // Build order line items using DB prices
  const resolvedItems = input.items
    .filter((i) => menuMap.has(i.menuItemId))
    .map((i) => {
      const item = menuMap.get(i.menuItemId)!;
      return {
        menuItemId: item._id,
        name:       item.name,
        quantity:   i.quantity,
        unitPrice:  item.price,
        total:      item.price * i.quantity
      };
    });

  if (resolvedItems.length === 0) {
    throw new AppError(400, 'None of the selected items are currently available', 'NO_AVAILABLE_ITEMS');
  }

  const totalAmount = resolvedItems.reduce((sum, i) => sum + i.total, 0);

  // Generate a short human-readable order number
  const prefix = input.locationType === 'room' ? 'R' : 'T';
  const orderNumber = `PUB-${prefix}${input.locationNumber}-${Date.now().toString(36).toUpperCase().slice(-5)}`;

  const order = await PublicOrder.create({
    propertyId:     input.propertyId,
    orderNumber,
    guestName:      input.guestName.trim(),
    locationType:   input.locationType,
    locationNumber: input.locationNumber.trim(),
    items:          resolvedItems,
    totalAmount,
    notes:          input.notes?.trim() || undefined,
    status:         'Received'
  });

  // Notify all Kitchen Staff assigned to this property so they see the new order
  const kitchenUsers = await User.find({
    role: 'Kitchen Staff',
    isActive: true,
    assignedPropertyIds: new mongoose.Types.ObjectId(input.propertyId)
  }).select('_id').lean();

  const locationLabel = `${input.locationType} ${input.locationNumber.trim()}`;
  const itemsSummary  = resolvedItems.map((i) => `${i.quantity}× ${i.name}`).join(', ');

  await Promise.all(
    kitchenUsers.map((u) =>
      createNotification({
        propertyId:  input.propertyId,
        userId:      u._id,
        title:       `New order — ${orderNumber}`,
        message:     `${input.guestName.trim()} (${locationLabel}): ${itemsSummary}`,
        type:        'Info',
        entityType:  'PublicOrder',
        entityId:    order._id
      })
    )
  );

  return {
    orderId:        String(order._id),
    orderNumber:    order.orderNumber,
    guestName:      order.guestName,
    locationType:   order.locationType,
    locationNumber: order.locationNumber,
    totalAmount:    order.totalAmount,
    status:         order.status,
    items:          resolvedItems,
    createdAt:      order.createdAt
  };
}

// ─── status polling ───────────────────────────────────────────────────────────

export async function getPublicOrderStatus(orderId: string) {
  const order = await PublicOrder.findById(orderId)
    .select('orderNumber guestName locationType locationNumber status totalAmount items createdAt')
    .lean();

  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

// ─── staff: list public orders ────────────────────────────────────────────────

export async function listPublicOrders(propertyId: string) {
  return PublicOrder.find({
    propertyId,
    status: { $nin: ['Delivered', 'Cancelled'] }
  })
    .sort({ createdAt: 1 }) // oldest first so kitchen sees what came in first
    .lean();
}

// ─── staff: update public order status ───────────────────────────────────────

export async function updatePublicOrderStatus(orderId: string, status: string) {
  const order = await PublicOrder.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

  const allowed = ['Received', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) {
    throw new AppError(400, 'Invalid status', 'INVALID_STATUS');
  }

  order.status = status as typeof order.status;
  await order.save();

  return order;
}
