/** Display formatting helpers. */

export function formatDateTimeDisplay(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateDisplay(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/** Current signed-in user's email (no auth layer yet — stored locally, editable). */
const USER_EMAIL_KEY = 'scs_user_email';
export function getUserEmail(): string {
  try {
    return (
      localStorage.getItem(USER_EMAIL_KEY) ||
      (import.meta.env.VITE_DEFAULT_USER_EMAIL as string | undefined) ||
      ''
    );
  } catch {
    return '';
  }
}
export function setUserEmail(email: string): void {
  try {
    localStorage.setItem(USER_EMAIL_KEY, email);
  } catch {
    /* ignore */
  }
}
