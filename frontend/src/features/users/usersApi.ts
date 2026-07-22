import { apiClient } from '../../services/apiClient';
import type { ApiResponse, StaffUser, UserRole } from '../../types/api';

export type CreateStaffUserInput = {
  fullName:   string;
  email:      string;
  password:   string;
  role:       UserRole;
  propertyId: string;
};

export type CreateStaffUserResponse = {
  user: StaffUser | null;
  reactivated: boolean;
  plainPassword: string;
};

export type ToggleStatusResponse = {
  id:       string;
  fullName: string;
  email:    string;
  isActive: boolean;
};

export async function listStaffUsers() {
  const { data } = await apiClient.get<ApiResponse<StaffUser[]>>('/users');
  return data.data;
}

export async function createStaffUser(input: CreateStaffUserInput) {
  const { data } = await apiClient.post<ApiResponse<CreateStaffUserResponse>>('/users', input);
  return data.data;
}

export async function toggleStaffStatus(userId: string) {
  const { data } = await apiClient.patch<ApiResponse<ToggleStatusResponse>>(
    `/users/${userId}/toggle-status`
  );
  return data.data;
}

export async function deleteStaffUser(userId: string) {
  const { data } = await apiClient.delete<ApiResponse<{ id: string; fullName: string; email: string }>>(
    `/users/${userId}`
  );
  return data.data;
}

export async function resetStaffPassword(userId: string, password: string) {
  const { data } = await apiClient.patch<ApiResponse<{ id: string; fullName: string; email: string }>>(
    `/users/${userId}/reset-password`,
    { password }
  );
  return data.data;
}
