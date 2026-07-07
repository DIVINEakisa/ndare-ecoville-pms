import bcrypt from 'bcrypt';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { Property } from './models/Property.js';
import { Room } from './models/Room.js';
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
  }

  const ownerEmail = 'owner@nuvrahub.com';
  const ownerPassword = 'ChangeMe123!';
  await User.findOneAndUpdate(
    { email: ownerEmail },
    {
      fullName: 'NuvraHub Owner',
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, env.BCRYPT_ROUNDS),
      role: 'Owner',
      assignedPropertyIds: createdProperties.map((property) => property._id),
      activePropertyId: createdProperties[0]?._id,
      isActive: true
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log('Seed complete');
  console.log(`Owner login: ${ownerEmail} / ${ownerPassword}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
