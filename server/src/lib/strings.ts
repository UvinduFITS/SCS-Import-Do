/** Small string utilities. */

/** Filesystem/header-safe token for filenames (e.g. PDF download names). */
export function safe(input: unknown): string {
  return String(input ?? '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60) || 'document';
}
