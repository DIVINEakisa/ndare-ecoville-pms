import type { Request, Response } from 'express';
import { createStaffUser, deleteStaffUser, listUsers, resetStaffPassword, toggleUserStatus } from '../services/userService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  return ok(res, users, 'Users loaded');
}

export async function createUserController(req: Request, res: Response) {
  const result = await createStaffUser({
    fullName:   req.body.fullName,
    email:      req.body.email,
    password:   req.body.password,
    role:       req.body.role,
    propertyId: req.body.propertyId,
    createdBy:  req.user?.id
  });

  const message = result.reactivated
    ? 'Staff account reactivated with new credentials'
    : 'Staff account created';

  // Return the plaintext password once so the admin can share it with the
  // staff member. It is never stored in plaintext — only the bcrypt hash is.
  return created(res, { ...result, plainPassword: req.body.password }, message);
}

export async function toggleUserStatusController(req: Request, res: Response) {
  const result = await toggleUserStatus(req.params.id, req.user!.id);
  const verb = result.isActive ? 'reactivated' : 'deactivated';
  return ok(res, result, `${result.fullName} has been ${verb}`);
}

export async function deleteUserController(req: Request, res: Response) {
  const result = await deleteStaffUser(req.params.id, req.user!.id);
  return ok(res, result, `${result.fullName} has been permanently removed`);
}

export async function resetStaffPasswordController(req: Request, res: Response) {
  const result = await resetStaffPassword(req.params.id, req.user!.id, req.body.password);
  return ok(res, result, `Password updated for ${result.fullName}`);
}
