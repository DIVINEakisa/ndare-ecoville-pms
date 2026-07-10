import { apiClient } from '../../services/apiClient';
import type { ApiResponse, StaffUser, UserRole } from '../../types/api';

export type CreateStaffUserInput = {
  fullName: string;
  email: string;
  role: UserRole;
  propertyId: string;
};

export type CreateStaffUserResponse = {
  user: StaffUser;
  temporaryPassword: string;
};

export type DeactivateStaffResponse = {
  id: string;
  fullName: string;
  email: string;
};

export async function listStaffUsers() {
  const { data } = await apiClient.get<ApiResponse<StaffUser[]>>('/users');
  return data.data;
}

export async function createStaffUser(input: CreateStaffUserInput) {
  const { data } = await apiClient.post<ApiResponse<CreateStaffUserResponse>>('/users', input);
  return data.data;
}

export async function deactivateStaffUser(userId: string) {
  const { data } = await apiClient.patch<ApiResponse<DeactivateStaffResponse>>(
    `/users/${userId}/deactivate`
  );
  return data.data;
}
