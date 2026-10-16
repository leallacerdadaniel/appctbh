import { Asset } from 'expo-asset';

import type { AppDocument } from '@/lib/documents.types';

export type { AppDocument } from '@/lib/documents.types';

/** Web: open in a new tab (browser PDF viewer) / save with the readable file name. */
async function resolveUrl(doc: AppDocument) {
  if (doc.source.kind === 'url') return doc.source.url;
  return Asset.fromModule(doc.source.module).uri;
}

export async function openDocument(doc: AppDocument) {
  window.open(await resolveUrl(doc), '_blank', 'noopener');
}

export async function downloadDocument(doc: AppDocument) {
  const res = await fetch(await resolveUrl(doc));
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blobUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = doc.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
