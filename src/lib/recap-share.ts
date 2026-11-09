import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Share card of "Mon semestre à BH" → PNG → share sheet (Instagram story, WhatsApp…).
 * Web has its own file (recap-share.web.ts): react-native-view-shot needs html2canvas there.
 */
export const canShareImage = true;

/** Instagram story size. `captureRef` takes points, so the pixel size is divided by the screen's ratio. */
const WIDTH_PX = 1080;
const HEIGHT_PX = 1920;

export async function shareCardImage(card: RefObject<ComponentRef<typeof View> | null>, dialogTitle: string) {
  if (!card.current) throw new Error('noCard');
  const ratio = PixelRatio.get();
  const uri = await captureRef(card, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: WIDTH_PX / ratio,
    height: HEIGHT_PX / ratio,
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error('unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}
