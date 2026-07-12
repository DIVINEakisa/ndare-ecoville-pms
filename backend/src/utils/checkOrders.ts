import { connectDatabase } from '../config/db.js';
import { PublicOrder } from '../models/PublicOrder.js';
import mongoose from 'mongoose';

await connectDatabase();
const orders = await PublicOrder.find({}).lean();
console.log(`Total public orders in Atlas: ${orders.length}`);
orders.forEach(o => console.log(
  `  ${o.orderNumber} | ${o.guestName} | ${o.locationType} ${o.locationNumber} | status: ${o.status} | propertyId: ${o.propertyId}`
));
await mongoose.disconnect();
process.exit(0);
