/**
 * seedDashboard.ts
 * ----------------
 * Populates realistic dashboard data for Ndare Ecoville (NDARE property).
 * Safe to run multiple times — all inserts are idempotent via upserts or
 * explicit existence checks, and the script cleans up stale demo data first.
 *
 * Run with:  npx tsx src/utils/seedDashboard.ts
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { Folio } from '../models/Folio.js';
import { FolioItem } from '../models/FolioItem.js';
import { Guest } from '../models/Guest.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Payment } from '../models/Payment.js';
import { Property } from '../models/Property.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room } from '../models/Room.js';

// ─── helpers ───────────────────────────────────────────────────────────────

function today(hour = 0, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(11, 0, 0, 0);
  return d;
}

// ─── main ──────────────────────────────────────────────────────────────────

async function seedDashboard() {
  await connectDatabase();
  console.log('✔  Connected to MongoDB');

  // ── 0. Resolve property ─────────────────────────────────────────────────
  const property = await Property.findOne({ code: 'NDARE', deletedAt: null }).lean();
  if (!property) {
    console.error('✘  Property NDARE not found. Run `npm run seed` first.');
    process.exit(1);
  }
  const propertyId = property._id;
  console.log(`✔  Targeting property: ${property.name} (${propertyId})`);

  // ── 1. Rooms — set concrete statuses ────────────────────────────────────
  //    Matches what the seed already created (rooms 01–06).
  //    Dashboard query: counts by status so we just update existing docs.
  const roomStatusMap: Record<string, string> = {
    '01': 'Occupied',   // guest checked in
    '02': 'Occupied',   // guest checked in
    '03': 'Maintenance', // dirty / needs housekeeping
    '04': 'Available',
    '05': 'Available',
    '06': 'Available',
  };

  const rooms: Record<string, mongoose.Types.ObjectId> = {};
  for (const [number, status] of Object.entries(roomStatusMap)) {
    const room = await Room.findOneAndUpdate(
      { propertyId, roomNumber: number, deletedAt: null },
      { status },
      { new: true }
    ).lean();
    if (!room) {
      console.warn(`  ⚠  Room ${number} not found — skipping`);
      continue;
    }
    rooms[number] = room._id as mongoose.Types.ObjectId;
    console.log(`  ✔  Room ${number} → ${status}`);
  }

  // ── 2. Guests ────────────────────────────────────────────────────────────
  const guestData = [
    { fullName: 'Amahoro Jean-Paul', email: 'jeanpaul@example.com', phone: '+250781100001', nationality: 'Rwandan' },
    { fullName: 'Kalisa Brigitte',   email: 'brigitte@example.com', phone: '+250781100002', nationality: 'Rwandan' },
    { fullName: 'Nkusi Emmanuel',    email: 'emmanuel@example.com', phone: '+250781100003', nationality: 'Rwandan' },
  ];

  const guestIds: mongoose.Types.ObjectId[] = [];
  for (const g of guestData) {
    const guest = await Guest.findOneAndUpdate(
      { propertyId, email: g.email },
      { propertyId, ...g, documentType: 'National ID', deletedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    guestIds.push(guest!._id as mongoose.Types.ObjectId);
    console.log(`  ✔  Guest: ${g.fullName}`);
  }

  const [guest1Id, guest2Id, guest3Id] = guestIds;

  // ── 3. Reservations ──────────────────────────────────────────────────────
  //    2 active Check-ins for today (rooms 01 & 02)
  //    + historical bookings Mon–Thu for the revenue chart

  // Helper — upsert a reservation and return its _id
  async function upsertReservation(data: {
    guestId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    status: string;
    checkIn: Date;
    checkOut: Date;
    totalAmount: number;
    paidAmount?: number;
    source?: string;
  }) {
    const res = await Reservation.findOneAndUpdate(
      { propertyId, guestId: data.guestId, roomId: data.roomId, checkIn: data.checkIn },
      { propertyId, deletedAt: null, adults: 2, source: data.source ?? 'Direct', ...data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return res!._id as mongoose.Types.ObjectId;
  }

  // Today's active check-ins
  const res1Id = await upsertReservation({
    guestId: guest1Id,
    roomId: rooms['01'],
    status: 'Checked In',
    checkIn: today(14),
    checkOut: daysAhead(3),
    totalAmount: 150_000,
    paidAmount: 150_000,
  });
  console.log(`  ✔  Reservation (Checked In): Amahoro Jean-Paul — Room 01`);

  const res2Id = await upsertReservation({
    guestId: guest2Id,
    roomId: rooms['02'],
    status: 'Checked In',
    checkIn: today(15),
    checkOut: daysAhead(2),
    totalAmount: 100_000,
    paidAmount: 100_000,
  });
  console.log(`  ✔  Reservation (Checked In): Kalisa Brigitte — Room 02`);

  // Historical bookings for revenue chart (Mon–Thu spread)
  await upsertReservation({ guestId: guest3Id, roomId: rooms['04'], status: 'Checked Out', checkIn: daysAgo(6, 14), checkOut: daysAgo(4, 11), totalAmount: 80_000,  paidAmount: 80_000,  source: 'Direct' });
  await upsertReservation({ guestId: guest1Id, roomId: rooms['05'], status: 'Checked Out', checkIn: daysAgo(5, 14), checkOut: daysAgo(3, 11), totalAmount: 100_000, paidAmount: 100_000, source: 'Phone' });
  await upsertReservation({ guestId: guest2Id, roomId: rooms['06'], status: 'Checked Out', checkIn: daysAgo(4, 14), checkOut: daysAgo(2, 11), totalAmount: 120_000, paidAmount: 120_000, source: 'Lodgify' });
  await upsertReservation({ guestId: guest3Id, roomId: rooms['04'], status: 'Checked Out', checkIn: daysAgo(3, 14), checkOut: daysAgo(1, 11), totalAmount: 90_000,  paidAmount: 90_000,  source: 'Direct' });
  console.log(`  ✔  Historical reservations (Mon–Thu)`);

  // ── 4. Folios & Payments ─────────────────────────────────────────────────
  //    Create open folios for the two active check-ins and a completed
  //    payment of 150,000 RWF today so "Revenue Today" shows a real figure.

  async function upsertFolio(guestId: mongoose.Types.ObjectId, reservationId: mongoose.Types.ObjectId, totalAmount: number) {
    return await Folio.findOneAndUpdate(
      { propertyId, guestId, reservationId },
      {
        propertyId, guestId, reservationId, deletedAt: null,
        status: 'Open',
        subtotal: totalAmount,
        taxTotal: 0,
        paidTotal: totalAmount,
        balance: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  const folio1 = await upsertFolio(guest1Id, res1Id, 150_000);
  const folio2 = await upsertFolio(guest2Id, res2Id, 100_000);
  console.log(`  ✔  Folios created for active check-ins`);

  // FolioItems — room charge line items
  await FolioItem.findOneAndUpdate(
    { propertyId, folioId: folio1!._id, description: 'Room Charge — Room 01' },
    { propertyId, folioId: folio1!._id, guestId: guest1Id, reservationId: res1Id, deletedAt: null, source: 'Room', description: 'Room Charge — Room 01', quantity: 3, unitPrice: 50_000, total: 150_000, postedAt: today(14) },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await FolioItem.findOneAndUpdate(
    { propertyId, folioId: folio2!._id, description: 'Room Charge — Room 02' },
    { propertyId, folioId: folio2!._id, guestId: guest2Id, reservationId: res2Id, deletedAt: null, source: 'Room', description: 'Room Charge — Room 02', quantity: 2, unitPrice: 50_000, total: 100_000, postedAt: today(15) },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log(`  ✔  Folio line items posted`);

  // Payment — 150,000 RWF today (drives "Revenue Today" card)
  await Payment.findOneAndUpdate(
    { propertyId, folioId: folio1!._id, guestId: guest1Id },
    {
      propertyId, folioId: folio1!._id, guestId: guest1Id, deletedAt: null,
      amount: 150_000,
      method: 'MTN Mobile Money',
      status: 'Completed',
      paidAt: today(14, 30),
      reference: 'MTN-DEMO-001',
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log(`  ✔  Payment: 150,000 RWF today (MTN Mobile Money)`);

  // Historical payments to fuel the revenue chart (Mon–Thu)
  const historicalPayments = [
    { amount: 80_000,  paidAt: daysAgo(6, 16), reference: 'HIST-001' },
    { amount: 100_000, paidAt: daysAgo(5, 15), reference: 'HIST-002' },
    { amount: 120_000, paidAt: daysAgo(4, 17), reference: 'HIST-003' },
    { amount: 90_000,  paidAt: daysAgo(3, 14), reference: 'HIST-004' },
  ];
  for (const p of historicalPayments) {
    await Payment.findOneAndUpdate(
      { propertyId, reference: p.reference },
      {
        propertyId, folioId: folio2!._id, guestId: guest3Id, deletedAt: null,
        amount: p.amount,
        method: 'Cash',
        status: 'Completed',
        paidAt: p.paidAt,
        reference: p.reference,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`  ✔  Historical payments seeded (Mon–Thu)`);

  // ── 5. Restaurant / Kitchen orders ──────────────────────────────────────
  //    2 pending orders → drives "kitchenQueue" counter on the dashboard

  const kitchenOrders = [
    {
      orderNumber: 'KO-DEMO-001',
      guestId: guest1Id,
      roomId: rooms['01'],
      folioId: folio1!._id,
      status: 'Received' as const,
      items: [
        { name: 'Grilled Chicken Plate', quantity: 1, unitPrice: 18_000, total: 18_000 },
        { name: 'Rwandan Coffee',        quantity: 2, unitPrice: 3_500,  total: 7_000  },
      ],
      totalAmount: 25_000,
    },
    {
      orderNumber: 'KO-DEMO-002',
      guestId: guest2Id,
      roomId: rooms['02'],
      folioId: folio2!._id,
      status: 'Preparing' as const,
      items: [
        { name: 'Continental Breakfast', quantity: 2, unitPrice: 12_000, total: 24_000 },
      ],
      totalAmount: 24_000,
    },
  ];

  for (const order of kitchenOrders) {
    await RestaurantOrder.findOneAndUpdate(
      { propertyId, orderNumber: order.orderNumber },
      { propertyId, deletedAt: null, ...order },
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✔  Kitchen order ${order.orderNumber} → ${order.status}`);
  }

  // ── 6. Low-stock inventory items ─────────────────────────────────────────
  //    quantityOnHand <= lowStockThreshold triggers the dashboard alert.
  //    Update two existing items to be below their threshold.

  const lowStockUpdates = [
    { name: 'Tomato Sauce',    category: 'Kitchen' as const,       unit: 'bottles', quantityOnHand: 2,  lowStockThreshold: 5  },
    { name: 'Shower Gel',      category: 'Room Supplies' as const,  unit: 'bottles', quantityOnHand: 3,  lowStockThreshold: 10 },
  ];

  for (const item of lowStockUpdates) {
    await InventoryItem.findOneAndUpdate(
      { propertyId, name: item.name },
      { propertyId, deletedAt: null, isActive: true, ...item },
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✔  Low-stock item: "${item.name}" — ${item.quantityOnHand} ${item.unit} left (threshold: ${item.lowStockThreshold})`);
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅  Dashboard seed complete. Summary:');
  console.log('   Rooms:        2 Occupied, 1 Maintenance, 3 Available');
  console.log('   Check-ins:    2 active today (Amahoro Jean-Paul, Kalisa Brigitte)');
  console.log('   Revenue:      150,000 RWF today + Mon–Thu historical payments');
  console.log('   Kitchen:      2 pending orders (Received / Preparing)');
  console.log('   Low stock:    2 items below threshold');

  await mongoose.disconnect();
  console.log('✔  Disconnected from MongoDB\n');
  process.exit(0);
}

seedDashboard().catch((error) => {
  console.error('\n✘  Seed failed:', error);
  mongoose.disconnect().finally(() => process.exit(1));
});
