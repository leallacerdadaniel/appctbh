import * as Clipboard from 'expo-clipboard';
import { requireOptionalNativeModule } from 'expo';

/**
 * One-tap Wi‑Fi join.
 *
 * Joining a network from an app needs native code that Expo Go does not ship:
 * - iOS: `NEHotspotConfigurationManager.shared.apply(NEHotspotConfiguration(ssid:passphrase:isWEP:false))`
 *   (needs the "Hotspot Configuration" entitlement: `ios.entitlements` →
 *   `com.apple.developer.networking.HotspotConfiguration: true` in app.json).
 * - Android 10+: `WifiNetworkSuggestion` / `WifiNetworkSpecifier` (CHANGE_WIFI_STATE permission).
 *
 * How the native path gets plugged in (wave 9, development build):
 * 1. Create a local Expo module (`npx create-expo-module --local`, name it `CtbhWifi`) whose
 *    native side exposes `connect(ssid: string, password: string): Promise<void>` using the APIs
 *    above, and rejects when the user refuses or the network is out of range.
 * 2. Add the entitlement / permission through app.json (or the module's config plugin).
 * 3. Build the dev client (`eas build --profile development`). Nothing changes here or in the
 *    screens: `requireOptionalNativeModule('CtbhWifi')` starts returning the module and the
 *    join happens natively. In Expo Go (and on web) the module is absent, so we fall back to
 *    copying the password and the screen tells the student to pick the network in Settings.
 */

type WifiModule = { connect(ssid: string, password: string): Promise<void> };

export type WifiResult = { method: 'joined' } | { method: 'copied' };

const NATIVE_MODULE = 'CtbhWifi';

function nativeWifi(): WifiModule | null {
  try {
    return requireOptionalNativeModule<WifiModule>(NATIVE_MODULE);
  } catch {
    return null;
  }
}

/** Joins the network natively when possible; otherwise copies the password. */
export async function connectToWifi(ssid: string, password: string): Promise<WifiResult> {
  const native = nativeWifi();
  if (native) {
    try {
      await native.connect(ssid, password);
      return { method: 'joined' };
    } catch {
      // Refused or out of range: fall through to the copy so the student can still join by hand.
    }
  }
  await Clipboard.setStringAsync(password);
  return { method: 'copied' };
}
