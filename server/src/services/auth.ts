/**
 * Authentication: issue/verify JWTs and handle email+password login.
 * Users live in the Google Sheet "USERS" tab (see services/users.ts).
 */

import jwt from 'jsonwebtoken';
import type { SafeUser, UserRole } from '@scs/shared';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';
import { findByEmail, recordLogin, toSafeUser, verifyPassword } from './users.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.userId, email: user.email, role: user.role, name: user.name },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, config.auth.jwtSecret) as jwt.JwtPayload;
  return {
    userId: String(decoded.sub),
    email: String(decoded.email),
    role: decoded.role as UserRole,
    name: String(decoded.name ?? ''),
  };
}

/** Validate credentials; returns a signed token + the safe user, or throws 401. */
export async function login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
  const unauthorized = new HttpError(401, 'Invalid email or password.');
  const user = await findByEmail(email);
  if (!user) throw unauthorized;
  if (!user.active) throw new HttpError(403, 'This account is disabled. Contact an administrator.');
  const ok = await verifyPassword(user, password);
  if (!ok) throw unauthorized;

  await recordLogin(user.userId);
  const safe = toSafeUser(user);
  return {
    token: signToken({ userId: safe.userId, email: safe.email, role: safe.role, name: safe.name }),
    user: safe,
  };
}
