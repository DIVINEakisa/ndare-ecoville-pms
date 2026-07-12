import { connectDatabase } from '../config/db.js';
import { Property } from '../models/Property.js';
import mongoose from 'mongoose';

await connectDatabase();
const props = await Property.find({ deletedAt: null }).lean();
props.forEach(p => console.log(`Name: ${p.name} | ID: ${p._id} | Code: ${p.code}`));
await mongoose.disconnect();
process.exit(0);
