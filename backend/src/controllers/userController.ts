import type { Request, Response } from 'express';
import { sendStaffInvitationEmail } from '../services/emailService.js';
import { createStaffUser, deactivateStaffUser, listUsers } from '../services/userService.js';
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

  // Send invitation email — wrapped so SMTP failures never block the API response
  try {
    await sendStaffInvitationEmail(
      result.user!.email,
      result.invitationUrl,
      req.body.role
    );
    console.info(`[Invite] Email sent to ${result.user!.email} (${req.body.role})`);
  } catch (emailError) {
    console.error(`[Invite] Failed to send invitation email to ${result.user!.email}:`, emailError);
  }

  return created(res, result.user, 'Staff account created');
}

export async function deactivateUserController(req: Request, res: Response) {
  const deactivated = await deactivateStaffUser(
    req.params.id,
    req.user!.id   // guaranteed by authenticate middleware
  );
  return ok(res, deactivated, `${deactivated.fullName} has been deactivated`);
}
