import { Folio } from '../models/Folio.js';
import { MenuCategory } from '../models/MenuCategory.js';
import { MenuItem } from '../models/MenuItem.js';
import { Reservation } from '../models/Reservation.js';
import { Room } from '../models/Room.js';
import { AppError } from '../utils/AppError.js';

export async function getGuestPortalContext(propertyId: string, roomId: string) {
  const room = await Room.findOne({ _id: roomId, propertyId, deletedAt: null }).select('roomNumber name type').lean();
  if (!room) throw new AppError(404, 'Room not found', 'ROOM_NOT_FOUND');

  const reservation = await Reservation.findOne({
    propertyId,
    roomId,
    status: 'Checked In',
    deletedAt: null
  })
    .populate('guestId', 'fullName')
    .lean();

  if (!reservation) throw new AppError(422, 'Guest portal is available only during an active stay', 'NO_ACTIVE_STAY');

  const [folio, categories, items] = await Promise.all([
    Folio.findOne({ propertyId, reservationId: reservation._id, guestId: reservation.guestId, deletedAt: null }).select(
      'subtotal taxTotal paidTotal balance status'
    ),
    MenuCategory.find({ propertyId, deletedAt: null, isActive: true }).sort({ displayOrder: 1, name: 1 }).lean(),
    MenuItem.find({ propertyId, deletedAt: null, isActive: true, isAvailable: true }).sort({ name: 1 }).lean()
  ]);

  return {
    room,
    reservation,
    folio,
    menu: categories.map((category) => ({
      ...category,
      items: items.filter((item) => String(item.categoryId) === String(category._id))
    })),
    wifi: {
      network: 'Ndare Guest',
      password: 'Provided at reception'
    },
    houseRules: [
      'Restaurant orders are posted to your room folio.',
      'Quiet hours begin at 10:00 PM.',
      'Contact reception for urgent assistance.'
    ],
    emergencyContacts: [
      { label: 'Reception', phone: '+250 000 000 000' },
      { label: 'Emergency', phone: '112' }
    ]
  };
}
