/**
 * cleanDashboard.ts
 * -----------------
 * Deletes all mock dashboard seed data from:
 *   Rooms, Reservations, Payments, Folios, FolioItems,
 *   Guests, RestaurantOrders, InventoryItems, StockMovements
 *
 * Does NOT touch: Users, Properties, RefreshTokens,
 *   PasswordResetTokens, Settings, EmailTemplates
 *
 * Run with:  npx tsx src/utils/cleanDashboard.ts
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { Folio } from '../models/Folio.js';
import { FolioItem } from '../models/FolioItem.js';
import { Guest } from '../models/Guest.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Payment } from '../models/Payment.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantOrder } from '../models/RestaurantOrder.js';
import { Room } from '../models/Room.js';
import { StockMovement } from '../models/StockMovement.js';

async function cleanDashboard() {
  await connectDatabase();
  console.log('✔  Connected to MongoDB\n');

  const collections = [
    { name: 'FolioItems',      model: FolioItem },
    { name: 'Folios',          model: Folio },
    { name: 'Payments',        model: Payment },
    { name: 'RestaurantOrders',model: RestaurantOrder },
    { name: 'Reservations',    model: Reservation },
    { name: 'Guests',          model: Guest },
    { name: 'Rooms',           model: Room },
    { name: 'InventoryItems',  model: InventoryItem },
    { name: 'StockMovements',  model: StockMovement },
  ] as const;

  let totalDeleted = 0;

  for (const col of collections) {
    const result = await (col.model as typeof FolioItem).deleteMany({});
    console.log(`  ✔  ${col.name}: deleted ${result.deletedCount} document(s)`);
    totalDeleted += result.deletedCount;
  }

  console.log(`\n✅  Clean complete — ${totalDeleted} total documents removed`);
  console.log('   Users, Properties, Settings and tokens were NOT touched.\n');

  await mongoose.disconnect();
  console.log('✔  Disconnected from MongoDB');
  process.exit(0);
}

cleanDashboard().catch((err) => {
  console.error('\n✘  Clean failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
