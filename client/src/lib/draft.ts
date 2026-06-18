/**
 * Form draft auto-save to localStorage. The form page saves every 30s and on
 * change; on reload the user is prompted to restore.
 */

import type { ImportDoForm } from '@scs/shared';

const DRAFT_KEY = 'scs_import_do_draft_v1';

export interface SavedDraft {
  savedAt: string;
  values: ImportDoForm;
}

export function saveDraft(values: ImportDoForm): void {
  try {
    const payload: SavedDraft = { savedAt: new Date().toISOString(), values };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function loadDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    if (!parsed?.values) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasDraft(): boolean {
  return loadDraft() !== null;
}
