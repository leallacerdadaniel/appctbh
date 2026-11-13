import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { Lang } from '@/i18n';

/**
 * The app's privacy policy, a public page of the Chez Toi website (drafts in docs/legal/, page
 * `/app/privacidade` on the site, PT / FR / EN). The stores ask for this URL, and the app links to it from
 * the login screen, Séjour › Aide and Charlotte's consent card.
 */
export const PRIVACY_URL = 'https://housing.cheztoibh.com.br/app/privacidade';
/** How to delete the account without the app (Google Play's "account deletion" link). */
export const DELETE_ACCOUNT_URL = 'https://housing.cheztoibh.com.br/app/excluir-conta';

/** Opens the policy in the in-app browser, in the app's language. */
export function openPrivacyPolicy(lang: Lang) {
  const url = `${PRIVACY_URL}?lang=${lang}`;
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
}
