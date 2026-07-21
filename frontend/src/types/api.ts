export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export type UserRole =
  | 'Owner'
  | 'Admin'
  | 'Property Manager'
  | 'Receptionist'
  | 'Cashier'
  | 'Housekeeper'
  | 'Kitchen Staff'
  | 'Housekeeper'
  | 'Department Staff';

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  assignedPropertyIds: string[];
  activePropertyId?: string;
};

export type Property = {
  _id: string;
  name: string;
  code: string;
  roomCount: number;
  currency: string;
  timezone: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Room = {
  _id: string;
  propertyId: string;
  roomNumber: string;
  name?: string;
  type: string;
  capacity: number;
  baseRate: number;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | 'Inactive';
  amenities: string[];
};

export type Guest = {
  _id: string;
  propertyId: string;
  fullName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  documentType?: 'Passport' | 'National ID' | 'Driver License' | 'Other';
  documentNumber?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
};

export type Reservation = {
  _id: string;
  propertyId: string;
  guestId: Guest | string;
  roomId: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'> | string;
  source: 'Direct' | 'Lodgify' | 'Phone' | 'Walk-in';
  status: 'Pending' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled' | 'No Show';
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
};

export type InventoryItem = {
  _id: string;
  propertyId: string;
  name: string;
  category: 'Kitchen' | 'Room Supplies' | 'Cleaning' | 'Utilities';
  unit: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  supplier?: string;
};

export type Requisition = {
  _id: string;
  propertyId: string;
  requestNumber: string;
  department: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Received';
  items: Array<{ inventoryItemId: string; name: string; quantity: number; unit: string }>;
  notes?: string;
  createdAt: string;
};

export type Notification = {
  _id: string;
  propertyId: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Danger';
  entityType?: string;
  readAt?: string | null;
  createdAt: string;
};

export type ReportSummary = {
  revenue: { total: number; count: number };
  paymentsByMethod: Array<{ _id: string; total: number; count: number }>;
  reservationsByStatus: Array<{ _id: string; count: number; totalAmount: number }>;
  occupancy: { roomsTotal: number; occupiedRooms: number; rate: number };
  restaurant: Array<{ _id: string; total: number; count: number }>;
  inventory: { lowStockItems: number };
  outstandingFolios: { total: number; count: number };
};

export type Setting = {
  _id: string;
  propertyId: string;
  key: string;
  value: unknown;
  description?: string;
};

export type EmailTemplate = {
  _id: string;
  propertyId: string;
  name: string;
  key: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
};

export type StaffUser = {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  assignedPropertyIds: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  activePropertyId?: {
    _id: string;
    name: string;
    code: string;
  };
  isActive: boolean;
  createdAt: string;
};

export type Folio = {
  _id: string;
  propertyId: string;
  guestId: Guest | string;
  reservationId?: Pick<Reservation, '_id' | 'checkIn' | 'checkOut' | 'status'> | string;
  status: 'Open' | 'Settled' | 'Partially Paid' | 'Void';
  subtotal: number;
  taxTotal: number;
  paidTotal: number;
  balance: number;
  updatedAt: string;
};

export type FolioItem = {
  _id: string;
  description: string;
  source: 'Room' | 'Restaurant' | 'Service' | 'Adjustment';
  quantity: number;
  unitPrice: number;
  total: number;
  postedAt: string;
};

export type Payment = {
  _id: string;
  amount: number;
  method: 'Cash' | 'Card' | 'MTN Mobile Money' | 'Airtel Money';
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  paidAt: string;
  reference?: string;
};
