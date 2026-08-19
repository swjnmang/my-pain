import { Category, PreSurvey, SetEntry } from './types';

function storageKey(uid: string): string {
  return `my-pain:activeSession:${uid}`;
}

export interface ActiveSessionDraft {
  type: 'template' | 'workout';
  id: string;
  date: string;
  planId: string | null;
  sourceName: string;
  category: Category;
  survey: PreSurvey;
  logs: Record<string, SetEntry[]>;
  comments: Record<string, string>;
  exerciseIds: string[];
  blocks: { id: string; name: string }[];
  exerciseBlockId: Record<string, string>;
  startedAt: number;
}

export function getActiveSessionDraft(uid: string): ActiveSessionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as ActiveSessionDraft) : null;
  } catch {
    return null;
  }
}

export function saveActiveSessionDraft(uid: string, draft: ActiveSessionDraft): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(uid), JSON.stringify(draft));
}

export function clearActiveSessionDraft(uid: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(uid));
}

export function draftMatches(
  draft: ActiveSessionDraft | null,
  type: string | null,
  id: string | null,
  date: string,
  planId: string | null
): draft is ActiveSessionDraft {
  return (
    !!draft &&
    draft.type === type &&
    draft.id === id &&
    draft.date === date &&
    draft.planId === planId
  );
}
