/**
 * seedAllSystemData.ts
 * --------------------
 * Comprehensive system seed — wipes and repopulates operational data
 * for the Ndare Ecoville property so the full app can be explored
 * without manually filling out forms.
 *
 * Preserves: Users, Properties, Settings, EmailTemplates, InventoryItems
 * Replaces:  Rooms, Guests, Reservations, Folios, MenuCategories,
 *            MenuItems, RestaurantOrders
 *
 * Run with:  npx tsx src/utils/seedAllSystemData.ts
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { Folio }           from '../models/Folio.js';
import { Guest }           from '../models/Guest.js';
import { MenuCategory }    from '../models/MenuCategory.js';
import { MenuItem }        from '../models/MenuItem.js';
import { Property }        from '../models/Property.js';
import { Reservation }     from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room }            from '../models/Room.js';

// ─── date helpers ────────────────────────────────────────────────────────────

function today(hour = 14): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}
function daysFromNow(n: number, hour = 11): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function seedAllSystemData() {
  await connectDatabase();
  console.log('\n✔  Connected to MongoDB');

  // ── 0. Resolve target property ───────────────────────────────────────────
  const property = await Property.findOne({ code: 'NDARE' }).lean();
  if (!property) {
    console.error('✘  Property NDARE not found. Run `npm run seed` first.');
    process.exit(1);
  }
  const pid = property._id as mongoose.Types.ObjectId;
  console.log(`✔  Target property: "${property.name}" (${pid})\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ROOMS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Rooms ──────────────────────────────────────────────────────');
  await Room.deleteMany({ propertyId: pid });
  console.log('   Cleared existing rooms');

  const roomDefs = [
    { roomNumber: '101', name: 'Deluxe King Suite',    type: 'Suite',     capacity: 2, baseRate: 55000, status: 'Occupied',   amenities: ['King Bed', 'AC', 'Mini Bar', 'Mountain View'] },
    { roomNumber: '102', name: 'Deluxe King Suite',    type: 'Suite',     capacity: 2, baseRate: 55000, status: 'Occupied',   amenities: ['King Bed', 'AC', 'Mini Bar', 'Garden View'] },
    { roomNumber: '201', name: 'Standard Double',      type: 'Double',    capacity: 2, baseRate: 35000, status: 'Available',  amenities: ['Double Bed', 'AC', 'Balcony'] },
    { roomNumber: '202', name: 'Standard Double',      type: 'Double',    capacity: 2, baseRate: 35000, status: 'Available',  amenities: ['Double Bed', 'AC', 'Balcony'] },
    { roomNumber: '301', name: 'Executive Penthouse',  type: 'Penthouse', capacity: 4, baseRate: 120000, status: 'Maintenance', amenities: ['King Bed', 'Jacuzzi', 'Rooftop Terrace', 'Butler Service'] },
    { roomNumber: '302', name: 'Standard Single',      type: 'Single',    capacity: 1, baseRate: 25000, status: 'Available',  amenities: ['Single Bed', 'AC', 'Work Desk'] },
  ] as const;

  const rooms: Record<string, mongoose.Types.ObjectId> = {};
  for (const def of roomDefs) {
    const room = await Room.create({ propertyId: pid, deletedAt: null, ...def });
    rooms[def.roomNumber] = room._id as mongoose.Types.ObjectId;
    console.log(`   ✔  Room ${def.roomNumber} · ${def.name} → ${def.status}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GUESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── Guests ─────────────────────────────────────────────────────');
  await Guest.deleteMany({ propertyId: pid });
  console.log('   Cleared existing guests');

  const guestDefs = [
    { fullName: 'John Doe',       email: 'john.doe@example.com',    phone: '+250781000001', nationality: 'Rwandan',  documentType: 'National ID' as const, documentNumber: '1199780123456789' },
    { fullName: 'Jane Smith',     email: 'jane.smith@example.com',  phone: '+250781000002', nationality: 'American', documentType: 'Passport'    as const, documentNumber: 'US998877665' },
    { fullName: 'Jean de Dieu',   email: 'jean.dedieu@example.com', phone: '+250781000003', nationality: 'Rwandan',  documentType: 'National ID' as const, documentNumber: '1198960123456789' },
  ];

  const guestIds: mongoose.Types.ObjectId[] = [];
  for (const def of guestDefs) {
    const guest = await Guest.create({ propertyId: pid, deletedAt: null, ...def });
    guestIds.push(guest._id as mongoose.Types.ObjectId);
    console.log(`   ✔  ${def.fullName} (${def.nationality})`);
  }
  const [johnId, janeId, jeanId] = guestIds;

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RESERVATIONS + FOLIOS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── Reservations & Folios ──────────────────────────────────────');
  await Folio.deleteMany({ propertyId: pid });
  await Reservation.deleteMany({ propertyId: pid });
  console.log('   Cleared existing reservations and folios');

  const resDefs = [
    {
      label:       'Booking 1 — John Doe · Room 101',
      guestId:     johnId,
      roomId:      rooms['101'],
      source:      'Walk-in' as const,
      status:      'Checked In' as const,
      checkIn:     today(14),
      checkOut:    daysFromNow(3, 11),
      adults:      2, children: 0,
      totalAmount: 150_000,
      paidAmount:  150_000,
      notes:       'Guest requested daily housekeeping.',
    },
    {
      label:       'Booking 2 — Jane Smith · Room 102',
      guestId:     janeId,
      roomId:      rooms['102'],
      source:      'Lodgify' as const,
      status:      'Checked In' as const,
      checkIn:     today(15),
      checkOut:    daysFromNow(5, 11),
      adults:      2, children: 1,
      totalAmount: 320_000,
      paidAmount:  160_000,
      notes:       'Lodgify booking — partial payment on arrival.',
    },
    {
      label:       'Booking 3 — Jean de Dieu · Room 201',
      guestId:     jeanId,
      roomId:      rooms['201'],
      source:      'Direct' as const,
      status:      'Confirmed' as const,
      checkIn:     daysFromNow(1, 14),
      checkOut:    daysFromNow(7, 11),
      adults:      1, children: 0,
      totalAmount: 120_000,
      paidAmount:  0,
      notes:       'Booking.com referral — direct payment on site.',
    },
  ];

  const reservationIds: mongoose.Types.ObjectId[] = [];
  for (const { label, ...def } of resDefs) {
    const res = await Reservation.create({ propertyId: pid, deletedAt: null, ...def });
    const resId = res._id as mongoose.Types.ObjectId;
    reservationIds.push(resId);

    // Create an open folio for each reservation
    const folio = await Folio.create({
      propertyId:    pid,
      guestId:       def.guestId,
      reservationId: resId,
      status:        'Open',
      subtotal:      def.totalAmount,
      taxTotal:      0,
      paidTotal:     def.paidAmount,
      balance:       def.totalAmount - def.paidAmount,
      deletedAt:     null,
    });

    console.log(`   ✔  ${label}`);
    console.log(`      Status: ${def.status} · Total: ${def.totalAmount.toLocaleString()} RWF · Folio: ${folio._id}`);
  }

  const [res1Id, res2Id] = reservationIds;

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MENU CATEGORIES & ITEMS  (upsert — preserve existing if present)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── Menu Categories & Items ────────────────────────────────────');

  const catBreakfast = await MenuCategory.findOneAndUpdate(
    { propertyId: pid, name: 'Breakfast' },
    { propertyId: pid, name: 'Breakfast', description: 'Morning meals and hot drinks', displayOrder: 1, isActive: true, deletedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const catMains = await MenuCategory.findOneAndUpdate(
    { propertyId: pid, name: 'Main Dishes' },
    { propertyId: pid, name: 'Main Dishes', description: 'Freshly prepared guest meals', displayOrder: 2, isActive: true, deletedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`   ✔  Category: Breakfast (${catBreakfast._id})`);
  console.log(`   ✔  Category: Main Dishes (${catMains._id})`);

  const menuItemDefs = [
    { categoryId: catBreakfast._id, name: 'Continental Breakfast', price: 12_000, preparationMinutes: 15 },
    { categoryId: catBreakfast._id, name: 'Rwandan Coffee',        price:  3_500, preparationMinutes:  8 },
    { categoryId: catMains._id,     name: 'Grilled Chicken Plate', price: 18_000, preparationMinutes: 30 },
    { categoryId: catMains._id,     name: 'Vegetable Curry',       price: 15_000, preparationMinutes: 25 },
  ];

  const menuItemMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const def of menuItemDefs) {
    const item = await MenuItem.findOneAndUpdate(
      { propertyId: pid, name: def.name },
      { propertyId: pid, ...def, isAvailable: true, isActive: true, deletedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    menuItemMap[def.name] = item._id as mongoose.Types.ObjectId;
    console.log(`   ✔  MenuItem: ${def.name} — ${def.price.toLocaleString()} RWF`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. RESTAURANT / KITCHEN ORDERS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── Restaurant Orders ──────────────────────────────────────────');
  await RestaurantOrder.deleteMany({ propertyId: pid });
  console.log('   Cleared existing orders');

  const chickenId = menuItemMap['Grilled Chicken Plate'];
  const coffeeId  = menuItemMap['Rwandan Coffee'];

  const orderDefs = [
    {
      orderNumber:  'ORD-101-001',
      guestId:      johnId,
      roomId:       rooms['101'],
      reservationId: res1Id,
      status:       'Preparing' as const,
      items: [
        { menuItemId: chickenId, name: 'Grilled Chicken Plate', quantity: 1, unitPrice: 18_000, total: 18_000 },
      ],
      totalAmount: 18_000,
    },
    {
      orderNumber:  'ORD-102-001',
      guestId:      janeId,
      roomId:       rooms['102'],
      reservationId: res2Id,
      status:       'Received' as const,
      items: [
        { menuItemId: coffeeId, name: 'Rwandan Coffee', quantity: 2, unitPrice: 3_500, total: 7_000 },
      ],
      totalAmount: 7_000,
    },
  ];

  for (const { reservationId: _r, ...def } of orderDefs) {
    await RestaurantOrder.create({ propertyId: pid, deletedAt: null, ...def });
    console.log(`   ✔  ${def.orderNumber} → ${def.status}`);
    console.log(`      ${def.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} · ${def.totalAmount.toLocaleString()} RWF`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅  Seed Complete — System Data Summary                     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Rooms:        6 (2 Occupied · 3 Available · 1 Maintenance) ║');
  console.log('║  Guests:       3 (John Doe · Jane Smith · Jean de Dieu)     ║');
  console.log('║  Reservations: 3 (2 Checked In · 1 Confirmed)              ║');
  console.log('║  Folios:       3 open folios linked to reservations         ║');
  console.log('║  Menu:         4 items across 2 categories                  ║');
  console.log('║  Orders:       2 active kitchen orders (Preparing/Received) ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  console.log('✔  Disconnected from MongoDB\n');
  process.exit(0);
}

seedAllSystemData().catch((err) => {
  console.error('\n✘  Seed failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
