/** /api/auth — login, current user, change password. */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, HttpError } from '../lib/errors.js';
import { login } from '../services/auth.js';
import { getUserById, setPassword, toSafeUser, verifyPassword } from '../services/users.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Email and password are required.');
    const { token, user } = await login(parsed.data.email, parsed.data.password);
    res.json({ token, user });
  }),
);

// GET /api/auth/me — fresh user record for the current token.
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user!.userId);
    if (!user || !user.active) throw new HttpError(401, 'Account no longer active.');
    res.json({ user: toSafeUser(user) });
  }),
);

// POST /api/auth/change-password
const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changeSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Current password and a new password (min 6 chars) are required.');
    const user = await getUserById(req.user!.userId);
    if (!user) throw new HttpError(401, 'Account not found.');
    if (!(await verifyPassword(user, parsed.data.currentPassword)))
      throw badRequest('Current password is incorrect.');
    await setPassword(user.userId, parsed.data.newPassword);
    res.json({ ok: true });
  }),
);
