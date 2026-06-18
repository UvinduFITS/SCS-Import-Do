/**
 * Auth middleware. `requireAuth` verifies the Bearer JWT and attaches req.user.
 * `requireAdmin` additionally enforces the admin role.
 */

import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.js';
import { verifyToken, type AuthUser } from '../services/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return next(new HttpError(401, 'Authentication required.'));
  }
  try {
    req.user = verifyToken(match[1]);
    return next();
  } catch {
    return next(new HttpError(401, 'Session expired or invalid. Please sign in again.'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Authentication required.'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Admin access required.'));
  return next();
}
