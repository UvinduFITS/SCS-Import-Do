/**
 * User store backed by the Google Sheet "USERS" tab. Passwords are bcrypt-hashed;
 * the hash never leaves the server. Roles: 'admin' | 'user'.
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { USER_COLUMNS, type SafeUser, type UserRole } from '@scs/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { badRequest, notFound } from '../lib/errors.js';
import { columnLetter, ensureTab, getSheetsApi } from './sheets.js';

const TAB = config.google.usersTab;
const COLUMNS = USER_COLUMNS as unknown as string[];
const LAST_COLUMN = columnLetter(COLUMNS.length);
const SALT_ROUNDS = 10;

/** Full user record including the password hash (server-internal only). */
interface UserRecord extends SafeUser {
  passwordHash: string;
}

export async function ensureUsersTab(): Promise<void> {
  await ensureTab(TAB, COLUMNS);
}

function rowToUser(headers: string[], row: string[]): UserRecord {
  const get = (col: string) => {
    const idx = headers.indexOf(col);
    return idx >= 0 ? (row[idx] ?? '') : '';
  };
  return {
    userId: get('userId'),
    email: get('email'),
    role: (get('role') as UserRole) || 'user',
    name: get('name'),
    passwordHash: get('passwordHash'),
    active: get('active') !== 'FALSE' && get('active') !== 'false',
    createdAt: get('createdAt'),
    createdByEmail: get('createdByEmail'),
    lastLoginAt: get('lastLoginAt'),
  };
}

function userToRow(user: UserRecord): string[] {
  const map: Record<string, string> = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    name: user.name,
    passwordHash: user.passwordHash,
    active: user.active ? 'TRUE' : 'FALSE',
    createdAt: user.createdAt,
    createdByEmail: user.createdByEmail,
    lastLoginAt: user.lastLoginAt,
  };
  return COLUMNS.map((c) => map[c] ?? '');
}

export function toSafeUser(user: UserRecord): SafeUser {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

async function readAll(): Promise<{ users: UserRecord[]; rowById: Map<string, number> }> {
  const client = getSheetsApi();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A1:${LAST_COLUMN}`,
  });
  const values = res.data.values ?? [];
  const headers = (values[0] as string[]) ?? COLUMNS;
  const users: UserRecord[] = [];
  const rowById = new Map<string, number>();
  for (let i = 1; i < values.length; i++) {
    const row = values[i] as string[];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const user = rowToUser(headers, row);
    if (!user.userId && !user.email) continue;
    users.push(user);
    rowById.set(user.userId, i + 1);
  }
  return { users, rowById };
}

export async function listUsers(): Promise<SafeUser[]> {
  const { users } = await readAll();
  return users
    .map(toSafeUser)
    .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
}

/** Internal: find a user (with hash) by email — used for login. */
export async function findByEmail(email: string): Promise<UserRecord | null> {
  const { users } = await readAll();
  const lower = email.trim().toLowerCase();
  return users.find((u) => u.email.trim().toLowerCase() === lower) ?? null;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const { users } = await readAll();
  return users.find((u) => u.userId === userId) ?? null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  createdByEmail: string;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw badRequest('Email is required.');
  if (!input.password || input.password.length < 6)
    throw badRequest('Password must be at least 6 characters.');
  if (await findByEmail(email)) throw badRequest(`A user with email "${email}" already exists.`);

  const user: UserRecord = {
    userId: uuidv4(),
    email,
    role: input.role === 'admin' ? 'admin' : 'user',
    name: input.name?.trim() || email,
    passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
    active: true,
    createdAt: new Date().toISOString(),
    createdByEmail: input.createdByEmail || '',
    lastLoginAt: '',
  };

  await getSheetsApi().spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [userToRow(user)] },
  });

  logger.info('User created', { email, role: user.role });
  return toSafeUser(user);
}

async function writeUserRow(userId: string, mutate: (u: UserRecord) => UserRecord): Promise<UserRecord> {
  const { users, rowById } = await readAll();
  const existing = users.find((u) => u.userId === userId);
  const rowNumber = rowById.get(userId);
  if (!existing || !rowNumber) throw notFound(`User ${userId} not found.`);
  const updated = mutate(existing);
  await getSheetsApi().spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A${rowNumber}:${LAST_COLUMN}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [userToRow(updated)] },
  });
  return updated;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  active?: boolean;
}

export async function updateUser(userId: string, patch: UpdateUserInput): Promise<SafeUser> {
  const updated = await writeUserRow(userId, (u) => ({
    ...u,
    name: patch.name !== undefined ? patch.name.trim() : u.name,
    role: patch.role !== undefined ? (patch.role === 'admin' ? 'admin' : 'user') : u.role,
    active: patch.active !== undefined ? patch.active : u.active,
  }));
  logger.info('User updated', { userId, role: updated.role, active: updated.active });
  return toSafeUser(updated);
}

export async function setPassword(userId: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6)
    throw badRequest('Password must be at least 6 characters.');
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await writeUserRow(userId, (u) => ({ ...u, passwordHash: hash }));
  logger.info('Password updated', { userId });
}

export async function recordLogin(userId: string): Promise<void> {
  await writeUserRow(userId, (u) => ({ ...u, lastLoginAt: new Date().toISOString() })).catch((e) =>
    logger.warn('Could not record login time', { userId, message: (e as Error).message }),
  );
}

export async function deleteUser(userId: string): Promise<void> {
  const client = getSheetsApi();
  const { rowById } = await readAll();
  const rowNumber = rowById.get(userId);
  if (!rowNumber) throw notFound(`User ${userId} not found.`);

  // Resolve the USERS tab gridId for the row delete.
  const meta = await client.spreadsheets.get({ spreadsheetId: config.google.sheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === TAB);
  const gridId = sheet?.properties?.sheetId;
  if (gridId === undefined || gridId === null) throw notFound(`USERS tab not found.`);

  await client.spreadsheets.batchUpdate({
    spreadsheetId: config.google.sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: gridId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
  logger.info('User deleted', { userId });
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function countUsers(): Promise<number> {
  const { users } = await readAll();
  return users.length;
}

/** Create the seed admin from env if the USERS tab is empty. */
export async function bootstrapAdmin(): Promise<void> {
  const { email, password, name } = config.auth.bootstrapAdmin;
  if (!email || !password) {
    logger.warn('No ADMIN_EMAIL/ADMIN_PASSWORD set — skipping admin bootstrap.');
    return;
  }
  if ((await countUsers()) > 0) return;

  await createUser({
    email,
    name: name || 'Administrator',
    role: 'admin',
    password,
    createdByEmail: 'system-bootstrap',
  });
  logger.info('Bootstrapped first admin user', { email });
}
