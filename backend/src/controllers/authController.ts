import type { Request, Response } from 'express';
import { login, refreshSession, requestPasswordReset, resetPassword } from '../services/authService.js';
import { revokeRefreshToken } from '../services/tokenService.js';
import { ok } from '../utils/apiResponse.js';

export async function loginController(req: Request, res: Response) {
  const session = await login({
    email: req.body.email,
    password: req.body.password,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return ok(res, session, 'Signed in successfully');
}

export async function refreshController(req: Request, res: Response) {
  const session = await refreshSession({
    refreshToken: req.body.refreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return ok(res, session, 'Session refreshed');
}

export async function logoutController(req: Request, res: Response) {
  await revokeRefreshToken(req.body.refreshToken);
  return ok(res, null, 'Signed out successfully');
}

export async function meController(req: Request, res: Response) {
  return ok(res, req.user, 'Current user loaded');
}

export async function forgotPasswordController(req: Request, res: Response) {
  await requestPasswordReset(req.body.email);
  return ok(res, null, 'If an account exists, a reset email will be sent');
}

export async function resetPasswordController(req: Request, res: Response) {
  await resetPassword({ token: req.body.token, password: req.body.password });
  return ok(res, null, 'Password reset successfully');
}
