import type { Types } from 'mongoose';
import type { UserRole } from './roles.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      assignedPropertyIds: string[];
      activePropertyId?: string;
    }

    interface Request {
      user?: User;
      propertyScope?: {
        isGlobal: boolean;
        propertyIds: Types.ObjectId[];
        activePropertyId?: Types.ObjectId;
      };
    }
  }
}

export {};
