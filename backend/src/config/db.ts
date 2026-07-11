import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Force Node.js to use Google's public DNS so SRV lookups for
// MongoDB Atlas work even when the local router blocks them
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
}
