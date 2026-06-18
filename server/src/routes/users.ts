/** /api/users — admin-only user management. */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';
import {
  createUser,
  deleteUser,
  listUsers,
  setPassword,
  updateUser,
} from '../services/users.js';

export const usersRouter = Router();

// All routes require an authenticated admin.
usersRouter.use(requireAuth, requireAdmin);

// GET /api/users
usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ users: await listUsers() });
  }),
);

// POST /api/users — add a user.
const createSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(''),
  role: z.enum(['admin', 'user']).default('user'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});
usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message || 'Invalid user data.');
    const user = await createUser({
      ...parsed.data,
      createdByEmail: req.user!.email,
    });
    res.status(201).json({ user });
  }),
);

// PUT /api/users/:id — update name/role/active.
const updateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  active: z.boolean().optional(),
});
usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid update.');
    // Prevent an admin from demoting or disabling their own account (lock-out guard).
    if (req.params.id === req.user!.userId) {
      if (parsed.data.role === 'user') throw badRequest('You cannot remove your own admin role.');
      if (parsed.data.active === false) throw badRequest('You cannot disable your own account.');
    }
    const user = await updateUser(req.params.id, parsed.data);
    res.json({ user });
  }),
);

// POST /api/users/:id/reset-password
const pwSchema = z.object({ newPassword: z.string().min(6) });
usersRouter.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const parsed = pwSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('New password must be at least 6 characters.');
    await setPassword(req.params.id, parsed.data.newPassword);
    res.json({ ok: true });
  }),
);

// DELETE /api/users/:id
usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) throw badRequest('You cannot delete your own account.');
    await deleteUser(req.params.id);
    res.json({ ok: true });
  }),
);
