import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Web build: react-native-view-shot would need html2canvas-pro, and the Web Share API can't share a local
 * file. The recap still plays on the web; the share slide says to share from the phone instead.
 */
export const canShareImage = false;

export async function shareCardImage(_card: RefObject<ComponentRef<typeof View> | null>, _dialogTitle: string): Promise<void> {
  throw new Error('unavailable');
}
