import { useSyncExternalStore } from 'react';

import type { Lang } from '@/i18n';
import { AppApiError, assistantApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * The AI assistant ("app-assistant" function). The conversation lives in memory only, for as long
 * as the app runs: it survives leaving and reopening the screen, never reaches the disk, and is
 * dropped when another student signs in. The server doesn't keep it either.
 */

export type AssistantError = 'notConfigured' | 'limit' | 'busy' | 'noRental' | 'invalid' | 'network' | 'server';

/** One question and what came back. */
export type Exchange = {
  id: string;
  question: string;
  status: 'pending' | 'answered' | 'refused' | 'error';
  answer?: string;
  error?: AssistantError;
};

/** The server cuts every message here. */
export const MAX_QUESTION = 1500;
/** The server reads the last 12 turns; 11 keeps the history starting with a question. */
const MAX_TURNS = 11;

type Store = { owner: string | null; exchanges: Exchange[] };

let store: Store = { owner: null, exchanges: [] };
const listeners = new Set<() => void>();

function set(next: Store) {
  store = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => store;

function patch(id: string, fields: Partial<Exchange>) {
  // The conversation may have been cleared while the answer was on its way.
  if (!store.exchanges.some((e) => e.id === id)) return;
  set({ ...store, exchanges: store.exchanges.map((e) => (e.id === id ? { ...e, ...fields } : e)) });
}

const KNOWN: AssistantError[] = ['notConfigured', 'limit', 'busy', 'noRental', 'invalid', 'network'];

function toError(e: unknown): AssistantError {
  const code = e instanceof AppApiError ? e.code : 'server';
  return (KNOWN as string[]).includes(code) ? (code as AssistantError) : 'server';
}

/** Answered exchanges before this one, as turns, then its question. Refused and failed ones are left out. */
function history(id: string) {
  const index = store.exchanges.findIndex((e) => e.id === id);
  const turns = store.exchanges
    .slice(0, index)
    .filter((e) => e.status === 'answered' && e.answer)
    .flatMap((e) => [
      { role: 'user' as const, content: e.question },
      { role: 'assistant' as const, content: e.answer! },
    ]);
  return [...turns, { role: 'user' as const, content: store.exchanges[index].question }].slice(-MAX_TURNS);
}

async function run(token: string | null, id: string, lang: Lang) {
  try {
    const r = await assistantApi<{ answer: string | null; refused: boolean }>('ask', {
      token,
      body: { messages: history(id), lang },
    });
    if (r.refused || !r.answer?.trim()) patch(id, { status: 'refused', answer: undefined });
    else patch(id, { status: 'answered', answer: r.answer.trim() });
  } catch (e) {
    patch(id, { status: 'error', error: toError(e) });
  }
}

let counter = 0;

export function useAssistant() {
  const { token } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const exchanges = snapshot.owner === token ? snapshot.exchanges : [];
  const pending = exchanges.some((e) => e.status === 'pending');

  return {
    exchanges,
    pending,
    send(question: string, lang: Lang) {
      const text = question.trim().slice(0, MAX_QUESTION);
      if (!text || pending) return;
      const id = `q${Date.now()}-${counter++}`;
      const before = store.owner === token ? store.exchanges : [];
      set({ owner: token, exchanges: [...before, { id, question: text, status: 'pending' }] });
      run(token, id, lang);
    },
    retry(id: string, lang: Lang) {
      if (pending) return;
      patch(id, { status: 'pending', error: undefined });
      run(token, id, lang);
    },
    clear() {
      set({ owner: token, exchanges: [] });
    },
  };
}

/** Plain text for the bubble: the model sometimes still writes **bold**. */
export const plainAnswer = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '');

/** The answer sends the student to the team (it doesn't know): show the WhatsApp link under it. */
export const pointsToTeam = (text: string) => /whatsapp/i.test(text);
