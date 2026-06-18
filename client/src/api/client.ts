import type { ImportDoForm, ImportDoRecord, SafeUser, UserRole } from '@scs/shared';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'scs_auth_token';

function url(path: string): string {
  return `${BASE}${path}`;
}

// ── Token storage ──────────────────────────────────────────────────────────
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  issues?: { field: string; message: string }[];
  constructor(status: number, message: string, issues?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

/** On a 401, drop the token and notify the app to bounce to /login. */
function handleUnauthorized() {
  clearToken();
  window.dispatchEvent(new Event('scs-unauthorized'));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers, ...rest } = init ?? {};
  const res = await fetch(url(path), { headers: authHeaders(headers), ...rest });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(res.status, body?.message || `Request failed (${res.status})`, body?.issues);
  }
  return body as T;
}

/** Fetch a binary PDF, returning the Blob + suggested filename. */
async function requestPdf(path: string, init?: RequestInit): Promise<{ blob: Blob; filename: string }> {
  const { headers, ...rest } = init ?? {};
  const res = await fetch(url(path), { headers: authHeaders(headers), ...rest });
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const text = await res.text().catch(() => '');
    let message = `PDF generation failed (${res.status})`;
    try {
      message = JSON.parse(text)?.message || message;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return { blob: await res.blob(), filename: match?.[1] || 'delivery-order.pdf' };
}

export interface RecordResponse {
  record: ImportDoRecord;
}
export interface RecordsResponse {
  records: ImportDoRecord[];
  count: number;
}
export interface PdfRecordResponse {
  record: ImportDoRecord | null;
  pdfBase64?: string;
  filename?: string;
  /** false when the row could not be written to the history Sheet (PDF still returned). */
  savedToHistory?: boolean;
}

export const api = {
  listRecords: () => request<RecordsResponse>('/api/records'),
  getRecord: (id: string) => request<RecordResponse>(`/api/records/${encodeURIComponent(id)}`),

  /** Create a new record (createdBy is taken from the auth token server-side). */
  createRecord: (form: ImportDoForm, generate = false) =>
    request<PdfRecordResponse>('/api/records', {
      method: 'POST',
      body: JSON.stringify({ form, generate }),
    }),

  updateRecord: (id: string, form: ImportDoForm) =>
    request<RecordResponse>(`/api/records/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ form }),
    }),

  generatePdf: (id: string) =>
    request<PdfRecordResponse>(`/api/records/${encodeURIComponent(id)}/generate-pdf`, { method: 'POST' }),

  downloadRecordPdf: (id: string) => requestPdf(`/api/records/${encodeURIComponent(id)}/pdf`),

  downloadFormPdf: (form: ImportDoForm) =>
    requestPdf('/api/pdf', { method: 'POST', body: JSON.stringify({ form }) }),

  duplicate: (id: string) =>
    request<RecordResponse>(`/api/records/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),

  deleteRecord: (id: string) =>
    request<{ ok: true }>(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: SafeUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: SafeUser }>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ── Users (admin) ─────────────────────────────────────────────────────────────
export interface NewUserInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}
export const usersApi = {
  list: () => request<{ users: SafeUser[] }>('/api/users'),
  create: (input: NewUserInput) =>
    request<{ user: SafeUser }>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: { name?: string; role?: UserRole; active?: boolean }) =>
    request<{ user: SafeUser }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  resetPassword: (id: string, newPassword: string) =>
    request<{ ok: true }>(`/api/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
