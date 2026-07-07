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
  | 'Kitchen Staff'
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
