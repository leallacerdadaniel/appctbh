import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import type { AppDocument } from '@/lib/documents.types';

export type { AppDocument } from '@/lib/documents.types';

/**
 * Native (iOS/Android). The PDF is first copied/downloaded into the app cache
 * under a readable name, then:
 * - open: Quick Look (iOS) / default PDF viewer (Android), inside the app flow
 * - download: system share sheet → "Save to Files", Drive, e‑mail…
 */
async function toLocalFile(doc: AppDocument): Promise<File> {
  const dir = new Directory(Paths.cache, 'documents');
  if (!dir.exists) dir.create();
  const target = new File(dir, doc.fileName);

  if (doc.source.kind === 'asset') {
    const asset = await Asset.fromModule(doc.source.module).downloadAsync();
    await new File(asset.localUri ?? asset.uri).copy(target, { overwrite: true });
    return target;
  }
  return File.downloadFileAsync(doc.source.url, target, { idempotent: true });
}

export async function openDocument(doc: AppDocument) {
  const file = await toLocalFile(doc);
  if (await file.canPreview()) {
    await file.preview();
  } else if (doc.source.kind === 'url') {
    await WebBrowser.openBrowserAsync(doc.source.url);
  } else {
    await shareFile(file);
  }
}

export async function downloadDocument(doc: AppDocument) {
  await shareFile(await toLocalFile(doc));
}

async function shareFile(file: File) {
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
