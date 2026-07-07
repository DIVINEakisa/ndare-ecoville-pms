import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

type AccessPayload = {
  sub: string;
  email: string;
  role: Express.User['role'];
};

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    const user = await User.findOne({ _id: payload.sub, isActive: true, deletedAt: null }).lean();

    if (!user) {
      throw new AppError(401, 'User session is no longer valid', 'INVALID_SESSION');
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedPropertyIds: user.assignedPropertyIds.map((id: Types.ObjectId) => String(id)),
      activePropertyId: user.activePropertyId ? String(user.activePropertyId) : undefined
    };

    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'Invalid or expired access token', 'INVALID_TOKEN');
  }
}
