import { apiClient } from '../../services/apiClient';
import type { ApiResponse, InventoryItem, Notification, PaginationMeta, Requisition } from '../../types/api';

type ListResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export async function listInventory(params: Record<string, string | number | boolean | undefined>) {
  const { data } = await apiClient.get<ListResponse<InventoryItem>>('/inventory', { params });
  return { items: data.data, meta: data.meta };
}

export async function createInventoryItem(input: Omit<InventoryItem, '_id'>) {
  const { data } = await apiClient.post<ApiResponse<InventoryItem>>('/inventory', input);
  return data.data;
}

export async function adjustStock(input: { id: string; type: 'Purchase' | 'Issue' | 'Adjustment'; quantity: number; notes?: string }) {
  const { data } = await apiClient.post<ApiResponse<InventoryItem>>(`/inventory/${input.id}/stock-movements`, {
    type: input.type,
    quantity: input.quantity,
    notes: input.notes
  });
  return data.data;
}

export async function listRequisitions(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<Requisition>>('/requisitions', { params });
  return { items: data.data, meta: data.meta };
}

export async function createRequisition(input: {
  propertyId: string;
  department: string;
  notes?: string;
  items: Array<{ inventoryItemId: string; quantity: number }>;
}) {
  const { data } = await apiClient.post<ApiResponse<Requisition>>('/requisitions', input);
  return data.data;
}

export async function decideRequisition(input: { id: string; action: 'approve' | 'reject' | 'receive'; reason?: string }) {
  const { data } = await apiClient.post<ApiResponse<Requisition>>(`/requisitions/${input.id}/${input.action}`, {
    reason: input.reason
  });
  return data.data;
}

export async function listNotifications(params: Record<string, string | number | boolean | undefined>) {
  const { data } = await apiClient.get<ApiResponse<{ items: Notification[]; unread: number }> & { meta: PaginationMeta }>(
    '/notifications',
    { params }
  );
  return { items: data.data.items, unread: data.data.unread, meta: data.meta };
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
  return data.data;
}
