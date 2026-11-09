import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { Lang } from '@/i18n';
import { AppApiError, assistantApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * The AI assistant ("app-assistant" function). The conversation lives in memory only, for as long
 * as the app runs: it survives leaving and reopening the screen, never reaches the disk, and is
 * dropped when another student signs in. The server doesn't keep it either.
 *
 * A question can carry one photo (something broken in the apartment): it is resized to JPEG here,
 * sent as base64 with that question only, and its base64 is dropped once the answer arrives (later
 * turns go back as text, flagged `photo: true`). When the answer is a maintenance problem the server
 * returns `maintenance`, and the chat offers to open the maintenance request pre-filled.
 */

export type AssistantError =
  | 'notConfigured'
  | 'limit'
  | 'busy'
  | 'noRental'
  | 'invalid'
  | 'imageTooBig'
  | 'network'
  | 'server';

/** A photo attached to a question: a resized JPEG in the cache folder, with its base64 until answered. */
export type AssistantPhoto = { uri: string; width: number; height: number; base64?: string };

/** What the server read from the answer when it is a maintenance problem (values of the request form). */
export type MaintenanceHint = { title: string; category?: string; room?: string };

/** One question and what came back. */
export type Exchange = {
  id: string;
  question: string;
  photo?: AssistantPhoto;
  status: 'pending' | 'answered' | 'refused' | 'error';
  answer?: string;
  /** The server's signature of `answer` (security review, 2026-11-09): sent back with it, or the turn is dropped. */
  signature?: string;
  maintenance?: MaintenanceHint;
  error?: AssistantError;
};

/** The server cuts every message here. */
export const MAX_QUESTION = 1500;
/** The server reads the last 12 turns; 11 keeps the history starting with a question. */
const MAX_TURNS = 11;
/** Long side of the photo sent to the assistant, and its JPEG quality: enough to see the problem, ~200 KB. */
const PHOTO_LONG_SIDE = 1280;
const PHOTO_QUALITY = 0.6;
/** The server refuses bigger photos with `imageTooBig` (same value in app-assistant/index.ts). */
export const MAX_PHOTO_BASE64 = 2 * 1024 * 1024;

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

const KNOWN: AssistantError[] = ['notConfigured', 'limit', 'busy', 'noRental', 'invalid', 'imageTooBig', 'network'];

function toError(e: unknown): AssistantError {
  const code = e instanceof AppApiError ? e.code : 'server';
  return (KNOWN as string[]).includes(code) ? (code as AssistantError) : 'server';
}

/**
 * Answered exchanges before this one, as text turns, then its question with its photo.
 * Refused and failed ones are left out.
 */
function history(id: string) {
  const index = store.exchanges.findIndex((e) => e.id === id);
  const turns = store.exchanges
    .slice(0, index)
    .filter((e) => e.status === 'answered' && e.answer)
    .flatMap((e) => [
      { role: 'user' as const, content: e.question, ...(e.photo ? { photo: true } : {}) },
      { role: 'assistant' as const, content: e.answer!, ...(e.signature ? { signature: e.signature } : {}) },
    ]);
  const current = store.exchanges[index];
  const image = current.photo?.base64 ? { mediaType: 'image/jpeg', data: current.photo.base64 } : undefined;
  return [...turns, { role: 'user' as const, content: current.question, ...(image ? { image } : {}) }].slice(
    -MAX_TURNS,
  );
}

type AskResponse = {
  answer: string | null;
  refused: boolean;
  maintenance?: MaintenanceHint | null;
  /** Signature of `answer`, tied to the student: Charlotte only reads back answers she signed. */
  signature?: string | null;
};

async function run(token: string | null, id: string, lang: Lang) {
  try {
    const r = await assistantApi<AskResponse>('ask', { token, body: { messages: history(id), lang } });
    // Once answered, the photo only needs its file (thumbnail, maintenance request): drop the base64.
    const photo = store.exchanges.find((e) => e.id === id)?.photo;
    const light = photo && { uri: photo.uri, width: photo.width, height: photo.height };
    if (r.refused || !r.answer?.trim()) patch(id, { status: 'refused', answer: undefined, photo: light });
    else {
      const maintenance = r.maintenance?.title ? r.maintenance : undefined;
      const signature = r.signature ?? undefined;
      patch(id, { status: 'answered', answer: r.answer.trim(), signature, maintenance, photo: light });
    }
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
    send(question: string, lang: Lang, photo?: AssistantPhoto) {
      const text = question.trim().slice(0, MAX_QUESTION);
      if (!text || pending) return;
      const id = `q${Date.now()}-${counter++}`;
      const before = store.owner === token ? store.exchanges : [];
      set({ owner: token, exchanges: [...before, { id, question: text, photo, status: 'pending' }] });
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

/**
 * Prepares a picked photo for the assistant: at most 1280 px on the long side, JPEG at 0.6, with
 * its base64. Throws when the image can't be read.
 */
export async function preparePhoto(uri: string): Promise<AssistantPhoto> {
  const refs: { release(): void }[] = [];
  const keep = <T extends { release(): void }>(ref: T) => {
    refs.push(ref);
    return ref;
  };
  try {
    let image: ImageRef = await keep(ImageManipulator.manipulate(uri)).renderAsync();
    keep(image);
    const long = Math.max(image.width, image.height);
    if (long > PHOTO_LONG_SIDE) {
      const scale = PHOTO_LONG_SIDE / long;
      const size = { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
      image = keep(await keep(ImageManipulator.manipulate(image)).resize(size).renderAsync());
    }
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_QUALITY, base64: true });
    if (!saved.base64) throw new Error('No base64');
    return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 };
  } finally {
    refs.forEach((ref) => {
      try {
        ref.release();
      } catch {
        // Already released, or not releasable on this platform.
      }
    });
  }
}

/** Plain text for the bubble: the model sometimes still writes **bold**. */
export const plainAnswer = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '');

/** The answer sends the student to the team (it doesn't know): show the WhatsApp link under it. */
export const pointsToTeam = (text: string) => /whatsapp/i.test(text);

/* ---------- Consent and reports (store review, 2026-11-09) ---------- */

const consentKey = (email: string) => `ctbh.assistant.consent.v1.${email.toLowerCase()}`;

/**
 * Before the first question, Charlotte says plainly that questions and photos are processed by Claude
 * (Anthropic). Accepted once per student on this phone; `null` while it is being read.
 */
export function useAssistantConsent(email: string) {
  const [consent, setConsent] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(consentKey(email))
      .then((value) => alive && setConsent(value !== null))
      .catch(() => alive && setConsent(false));
    return () => {
      alive = false;
    };
  }, [email]);
  const accept = useCallback(() => {
    setConsent(true);
    AsyncStorage.setItem(consentKey(email), new Date().toISOString()).catch(() => {});
  }, [email]);
  return { consent, accept };
}

export type ReportReason = 'wrong' | 'inappropriate' | 'unsafe' | 'other';
export const REPORT_REASONS: ReportReason[] = ['wrong', 'inappropriate', 'unsafe', 'other'];
/** `unavailable`: the server doesn't have the route yet (404). */
export type ReportResult = 'sent' | 'unavailable' | 'failed';

/** "Signaler cette réponse": the answer, its question and the reason go to the team (app_assistant_reports). */
export async function reportAnswer(token: string | null, e: Exchange, reason: ReportReason): Promise<ReportResult> {
  if (!e.answer) return 'failed';
  try {
    await assistantApi('report', {
      token,
      body: { answer: e.answer.slice(0, 4000), question: e.question.slice(0, 2000), reason },
    });
    return 'sent';
  } catch (err) {
    return err instanceof AppApiError && err.code === 'notFound' ? 'unavailable' : 'failed';
  }
}
