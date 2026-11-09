import { Linking } from 'react-native';

import { contacts } from '@/lib/mock-data';
import { trackAction } from '@/lib/usage';

/** Opens the Chez Toi WhatsApp (optionally with a message ready to send); `from` is the screen, for the usage stats. */
export function openWhatsApp(from: string, text?: string) {
  trackAction('open_whatsapp', from);
  Linking.openURL(`https://wa.me/${contacts.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
}
