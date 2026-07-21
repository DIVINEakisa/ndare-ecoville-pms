import { apiClient } from '../../services/apiClient';
import type { ApiResponse, PaginationMeta, Room } from '../../types/api';

type ListResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export async function listRoomsForHousekeeping(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ListResponse<Room>>('/rooms', { params });
  return { items: data.data, meta: data.meta };
}

export async function updateRoomStatus(input: {
  roomId: string;
  status: Room['status'];
  maintenanceNote?: string;
}) {
  // PATCH /rooms/:id now accepts both rooms:manage (full edit) and rooms:status
  // (status-only). Housekeepers send only { status, maintenanceNote } and the
  // backend restricts the update to those fields automatically.
  const { data } = await apiClient.patch<ApiResponse<Room>>(`/rooms/${input.roomId}`, {
    status: input.status,
    ...(input.maintenanceNote ? { maintenanceNote: input.maintenanceNote } : {})
  });
  return data.data;
}
