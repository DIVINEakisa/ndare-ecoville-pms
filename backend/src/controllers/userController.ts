import type { Request, Response } from 'express';
import { sendStaffInvitationEmail } from '../services/emailService.js';
import { createStaffUser, deleteStaffUser, listUsers, toggleUserStatus } from '../services/userService.js';
import { ok, created } from '../utils/apiResponse.js';

export async function listUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  return ok(res, users, 'Users loaded');
}

export async function createUserController(req: Request, res: Response) {
  const result = await createStaffUser({
    fullName: req.body.fullName,
    email: req.body.email,
    role: req.body.role,
    propertyId: req.body.propertyId,
    createdBy: req.user?.id
  });

  const action = result.reactivated ? 'reactivated' : 'created';
  const successMessage = result.reactivated
    ? 'Staff account reactivated and new invitation sent'
    : 'Staff account created';

  // Fire-and-forget — do NOT await so the HTTP response returns immediately.
  // Email delivery happens in the background; failures are logged but never
  // block or timeout the API response.
  sendStaffInvitationEmail(
    result.user!.email,
    result.invitationUrl,
    req.body.role
  )
    .then(() => console.info(`[Invite] Email sent to ${result.user!.email} (${req.body.role}) — ${action}`))
    .catch((err) => console.error(`[Invite] Email failed for ${result.user!.email}:`, err?.message ?? err));

  return created(res, result.user, successMessage);
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
