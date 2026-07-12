import { apiClient } from '../../services/apiClient';
import type { ApiResponse, Guest, PaginationMeta, Reservation, Room } from '../../types/api';

type ListResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export async function listRooms(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<Room>>('/rooms', { params });
  return { items: data.data, meta: data.meta };
}

export async function listAvailableRooms(params: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
}) {
  const { data } = await apiClient.get<ApiResponse<Room[]>>('/rooms/availability', { params });
  return data.data;
}

export async function createRoom(input: Partial<Room> & { propertyId: string }) {
  const { data } = await apiClient.post<ApiResponse<Room>>('/rooms', input);
  return data.data;
}

export async function listGuests(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<Guest>>('/guests', { params });
  return { items: data.data, meta: data.meta };
}

export async function createGuest(input: Partial<Guest> & { propertyId: string }) {
  const { data } = await apiClient.post<ApiResponse<Guest>>('/guests', input);
  return data.data;
}

export async function listReservations(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<Reservation>>('/reservations', { params });
  return { items: data.data, meta: data.meta };
}

export async function createReservation(input: {
  propertyId: string;
  guestId: string;
  roomId: string;
  source: Reservation['source'];
  status: Reservation['status'];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
}) {
  const { data } = await apiClient.post<ApiResponse<Reservation>>('/reservations', input);
  return data.data;
}

export async function checkInReservation(input: {
  reservationId: string;
  guestDocument?: { documentType?: string; documentNumber?: string };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  payment?: { amount: number; method: string; reference?: string };
}) {
  const { data } = await apiClient.post<ApiResponse<unknown>>('/checkin', input);
  return data.data;
}

export async function checkOutReservation(input: {
  reservationId: string;
  payment?: { amount: number; method: string; reference?: string };
}) {
  const { data } = await apiClient.post<ApiResponse<unknown>>('/checkout', input);
  return data.data;
}
