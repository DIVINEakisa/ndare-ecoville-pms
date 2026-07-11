import { apiClient } from '../../services/apiClient';
import type { ApiResponse, Guest, PaginationMeta, Room } from '../../types/api';

export type MenuCategory = {
  _id: string;
  propertyId: string;
  name: string;
  description?: string;
  displayOrder: number;
  items?: MenuItem[];
};

export type MenuItem = {
  _id: string;
  propertyId: string;
  categoryId: MenuCategory | string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  preparationMinutes: number;
  isAvailable: boolean;
};

export type RestaurantOrder = {
  _id: string;
  propertyId: string;
  guestId: Pick<Guest, '_id' | 'fullName' | 'phone'> | string;
  roomId?: Pick<Room, '_id' | 'roomNumber'> | string;
  orderNumber: string;
  status: 'Received' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  totalAmount: number;
  createdAt: string;
};

type ListResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export async function listMenuCategories() {
  const { data } = await apiClient.get<ApiResponse<MenuCategory[]>>('/menu/categories');
  return data.data;
}

export async function createMenuCategory(input: { propertyId: string; name: string; description?: string; displayOrder: number }) {
  const { data } = await apiClient.post<ApiResponse<MenuCategory>>('/menu/categories', input);
  return data.data;
}

export async function listMenuItems(params: Record<string, string | number | boolean | undefined>) {
  const { data } = await apiClient.get<ListResponse<MenuItem>>('/menu/items', { params });
  return { items: data.data, meta: data.meta };
}

export async function createMenuItem(input: {
  propertyId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  preparationMinutes: number;
  isAvailable: boolean;
}) {
  const { data } = await apiClient.post<ApiResponse<MenuItem>>('/menu/items', input);
  return data.data;
}

export async function listOrders(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<RestaurantOrder>>('/orders', { params });
  return { items: data.data, meta: data.meta };
}

export async function createStaffOrder(input: {
  propertyId: string;
  guestId: string;
  roomId?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
}) {
  const { data } = await apiClient.post<ApiResponse<RestaurantOrder>>('/orders', input);
  return data.data;
}

export async function updateOrderStatus(input: { id: string; status: RestaurantOrder['status'] }) {
  const { data } = await apiClient.patch<ApiResponse<RestaurantOrder>>(`/orders/${input.id}/status`, { status: input.status });
  return data.data;
}

// ─── Public / walk-in orders (staff view) ────────────────────────────────────

export type PublicOrder = {
  _id: string;
  orderNumber: string;
  guestName: string;
  locationType: 'room' | 'table';
  locationNumber: string;
  status: 'Received' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  totalAmount: number;
  notes?: string;
  createdAt: string;
};

export async function listPublicOrders(propertyId: string) {
  const { data } = await apiClient.get<ApiResponse<PublicOrder[]>>(`/public/${propertyId}/queue`);
  return data.data;
}

export async function updatePublicOrderStatus(input: { id: string; status: PublicOrder['status'] }) {
  const { data } = await apiClient.patch<ApiResponse<PublicOrder>>(
    `/public/orders/${input.id}/status`,
    { status: input.status }
  );
  return data.data;
}

export async function getGuestPortal(propertyId: string, roomId: string) {
  const { data } = await apiClient.get<ApiResponse<{
    room: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'>;
    folio?: { subtotal: number; taxTotal: number; paidTotal: number; balance: number; status: string };
    menu: MenuCategory[];
    wifi: { network: string; password: string };
    houseRules: string[];
    emergencyContacts: Array<{ label: string; phone: string }>;
  }>>(`/portal/${propertyId}/${roomId}`);
  return data.data;
}

export async function createPortalOrder(input: {
  propertyId: string;
  roomId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
}) {
  const { data } = await apiClient.post<ApiResponse<RestaurantOrder>>(`/portal/${input.propertyId}/${input.roomId}/orders`, {
    items: input.items
  });
  return data.data;
}
