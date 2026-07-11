import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// Separate axios instance — no auth headers, open CORS
const publicClient = axios.create({ baseURL: API_URL });

export type PublicMenuItem = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  preparationMinutes: number;
  imageUrl?: string;
};

export type PublicMenuCategory = {
  _id: string;
  name: string;
  items: PublicMenuItem[];
};

export type PublicMenuResponse = {
  property: { _id: string; name: string; code: string };
  menu: PublicMenuCategory[];
};

export type PlaceOrderInput = {
  guestName:      string;
  locationType:   'room' | 'table';
  locationNumber: string;
  notes?:         string;
  items: Array<{ menuItemId: string; quantity: number }>;
};

export type PlacedOrder = {
  orderId:        string;
  orderNumber:    string;
  guestName:      string;
  locationType:   'room' | 'table';
  locationNumber: string;
  totalAmount:    number;
  status:         string;
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  createdAt:      string;
};

export async function fetchPublicMenu(propertyId: string): Promise<PublicMenuResponse> {
  const { data } = await publicClient.get(`/public/${propertyId}/menu`);
  return data.data;
}

export async function placePublicOrder(
  propertyId: string,
  input: PlaceOrderInput
): Promise<PlacedOrder> {
  const { data } = await publicClient.post(`/public/${propertyId}/orders`, input);
  return data.data;
}

export async function pollOrderStatus(orderId: string): Promise<{ status: string }> {
  const { data } = await publicClient.get(`/public/orders/${orderId}/status`);
  return data.data;
}
