import type { Request, Response } from 'express';
import { sendStaffInvitationEmail } from '../services/emailService.js';
import { createStaffUser, listUsers, toggleUserStatus } from '../services/userService.js';
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

  try {
    await sendStaffInvitationEmail(
      result.user!.email,
      result.invitationUrl,
      req.body.role
    );
    console.info(`[Invite] Email sent to ${result.user!.email} (${req.body.role}) — ${action}`);
  } catch (emailError) {
    console.error(`[Invite] Failed to send invitation email to ${result.user!.email}:`, emailError);
  }

  return created(res, result.user, successMessage);
}

export async function toggleUserStatusController(req: Request, res: Response) {
  const result = await toggleUserStatus(
    req.params.id,
    req.user!.id
  );
  const verb = result.isActive ? 'reactivated' : 'deactivated';
  return ok(res, result, `${result.fullName} has been ${verb}`);
}
