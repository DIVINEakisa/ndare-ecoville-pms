import { apiClient } from '../../services/apiClient';
import type { ApiResponse, Property } from '../../types/api';

export type DashboardSummary = {
  roomsTotal: number;
  occupiedRooms: number;
  occupancyRate: number;
  pendingReservations: number;
  arrivalsToday: number;
  departuresToday: number;
  revenueToday: number;
  restaurantSalesToday: number;
  outstandingFolios: number;
  lowStockItems: number;
  kitchenQueue: number;
};

export type PortfolioProperty = {
  id: string;
  name: string;
  roomsTotal: number;
  occupiedRooms: number;
  occupancyRate: number;
  revenue: number;
};

export async function getDashboardSummary(propertyId?: string) {
  const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary', {
    params: propertyId ? { propertyId } : undefined
  });
  return data.data;
}

export async function getPortfolioSummary() {
  const { data } = await apiClient.get<ApiResponse<PortfolioProperty[]>>('/dashboard/portfolio');
  return data.data;
}

export async function getProperties() {
  const { data } = await apiClient.get<ApiResponse<Property[]>>('/properties');
  return data.data;
}
