import bcrypt from 'bcrypt';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { Property } from './models/Property.js';
import { InventoryItem } from './models/InventoryItem.js';
import { EmailTemplate } from './models/EmailTemplate.js';
import { MenuCategory } from './models/MenuCategory.js';
import { MenuItem } from './models/MenuItem.js';
import { Room } from './models/Room.js';
import { Setting } from './models/Setting.js';
import { User } from './models/User.js';

const properties = [
  { name: 'Ndare Ecoville', code: 'NDARE', roomCount: 6 },
  { name: 'Property 2', code: 'PROP2', roomCount: 7 }
];

async function seed() {
  await connectDatabase();

  const createdProperties = [];
  for (const property of properties) {
    const saved = await Property.findOneAndUpdate({ code: property.code }, property, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
    createdProperties.push(saved);
  }

  for (const property of createdProperties) {
    const targetRooms = property.code === 'NDARE' ? 6 : 7;
    for (let index = 1; index <= targetRooms; index += 1) {
      await Room.findOneAndUpdate(
        { propertyId: property._id, roomNumber: String(index).padStart(2, '0') },
        {
          propertyId: property._id,
          roomNumber: String(index).padStart(2, '0'),
          name: `${property.code}-${String(index).padStart(2, '0')}`,
          type: 'Apartment',
          capacity: 2,
          baseRate: 50000,
          status: 'Available'
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const breakfast = await MenuCategory.findOneAndUpdate(
      { propertyId: property._id, name: 'Breakfast' },
      { propertyId: property._id, name: 'Breakfast', description: 'Morning meals and hot drinks', displayOrder: 1 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const mains = await MenuCategory.findOneAndUpdate(
      { propertyId: property._id, name: 'Main Dishes' },
      { propertyId: property._id, name: 'Main Dishes', description: 'Freshly prepared guest meals', displayOrder: 2 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const menuItems = [
      { categoryId: breakfast._id, name: 'Continental Breakfast', price: 12000, preparationMinutes: 15 },
      { categoryId: breakfast._id, name: 'Rwandan Coffee', price: 3500, preparationMinutes: 8 },
      { categoryId: mains._id, name: 'Grilled Chicken Plate', price: 18000, preparationMinutes: 30 },
      { categoryId: mains._id, name: 'Vegetable Curry', price: 15000, preparationMinutes: 25 }
    ];

    for (const item of menuItems) {
      await MenuItem.findOneAndUpdate(
        { propertyId: property._id, name: item.name },
        { propertyId: property._id, ...item, isAvailable: true, isActive: true },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const inventoryItems = [
      { name: 'Rice', category: 'Kitchen', unit: 'kg', quantityOnHand: 30, lowStockThreshold: 10, supplier: 'Local market' },
      { name: 'Cooking Oil', category: 'Kitchen', unit: 'liters', quantityOnHand: 12, lowStockThreshold: 5, supplier: 'Local market' },
      { name: 'Toilet Paper', category: 'Room Supplies', unit: 'rolls', quantityOnHand: 40, lowStockThreshold: 15, supplier: 'House supplier' },
      { name: 'Laundry Detergent', category: 'Cleaning', unit: 'kg', quantityOnHand: 8, lowStockThreshold: 4, supplier: 'House supplier' }
    ];

    for (const item of inventoryItems) {
      await InventoryItem.findOneAndUpdate(
        { propertyId: property._id, name: item.name },
        { propertyId: property._id, ...item, isActive: true },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const settings = [
      { key: 'currency', value: property.currency ?? 'RWF', description: 'Default property currency' },
      { key: 'taxRate', value: 0, description: 'Default tax rate percentage' },
      { key: 'checkInTime', value: '14:00', description: 'Default check-in time' },
      { key: 'checkOutTime', value: '11:00', description: 'Default check-out time' }
    ];

    for (const setting of settings) {
      await Setting.findOneAndUpdate(
        { propertyId: property._id, key: setting.key },
        { propertyId: property._id, ...setting },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    await EmailTemplate.findOneAndUpdate(
      { propertyId: property._id, key: 'receipt' },
      {
        propertyId: property._id,
        key: 'receipt',
        name: 'Payment Receipt',
        subject: 'Your receipt from {{propertyName}}',
        bodyText: 'Dear {{guestName}}, thank you for your payment of {{amount}}.',
        bodyHtml: '<p>Dear {{guestName}},</p><p>Thank you for your payment of <strong>{{amount}}</strong>.</p>',
        isActive: true
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const ownerEmail = 'owner@ndareecoville.rw';
  const ownerPassword = 'ChangeMe123!';

  const existingOwner = await User.findOne({ email: ownerEmail });
  if (existingOwner) {
    // Always keep both properties assigned — update every seed run
    await User.updateOne(
      { email: ownerEmail },
      {
        fullName: 'Ndare Ecoville Owner',
        role: 'Owner',
        assignedPropertyIds: createdProperties.map((p) => p._id),
        activePropertyId: createdProperties[0]?._id,
        isActive: true
      }
    );
  } else {
    await User.create({
      fullName: 'Ndare Ecoville Owner',
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, env.BCRYPT_ROUNDS),
      role: 'Owner',
      assignedPropertyIds: createdProperties.map((p) => p._id),
      activePropertyId: createdProperties[0]?._id,
      isActive: true
    });
    console.log(`Owner login: ${ownerEmail} / ${ownerPassword}`);
  }
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
