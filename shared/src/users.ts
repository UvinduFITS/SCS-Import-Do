/** User management types shared between client and server. */

export type UserRole = 'admin' | 'user';

export const USER_ROLES: UserRole[] = ['admin', 'user'];

/** A user as exposed to the client (never includes the password hash). */
export interface SafeUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  active: boolean;
  createdAt: string;
  createdByEmail: string;
  lastLoginAt: string;
}

/** Google Sheet column order for the USERS tab (passwordHash stays server-side). */
export const USER_COLUMNS = [
  'userId',
  'email',
  'role',
  'name',
  'passwordHash',
  'active',
  'createdAt',
  'createdByEmail',
  'lastLoginAt',
] as const;
