import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import {
  Platform,
  Text,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * The only icon entry point of the app: SF Symbols on iOS, Material Symbols on Android/web.
 * Add an icon = one entry with the SF name, the Material name and its codepoint
 * (from node_modules/expo-symbols/build/android/symbols.json).
 *
 * Android/web draw the glyph straight from the Material Symbols font, preloaded with the other
 * fonts in the root layout. (expo-symbols' own view loads the font per icon and pops in late.)
 */
export const ICON_FONT = 'MaterialSymbols_300Light';

type Entry = { ios: SFSymbol; iosActive?: SFSymbol; material: AndroidSymbol; glyph: number };

const REGISTRY = {
  home: { ios: 'house', iosActive: 'house.fill', material: 'home', glyph: 0xe88a },
  calendar: { ios: 'calendar', material: 'calendar_month', glyph: 0xebcc },
  apartment: { ios: 'building.2', iosActive: 'building.2.fill', material: 'apartment', glyph: 0xea40 },
  guide: { ios: 'book', iosActive: 'book.fill', material: 'menu_book', glyph: 0xea19 },
  profile: { ios: 'person', iosActive: 'person.fill', material: 'person', glyph: 0xe7fd },
  search: { ios: 'magnifyingglass', material: 'search', glyph: 0xe8b6 },
  cleaning: { ios: 'sparkles', material: 'mop', glyph: 0xe28d },
  rent: { ios: 'creditcard', material: 'payments', glyph: 0xef63 },
  wifi: { ios: 'wifi', material: 'wifi', glyph: 0xe63e },
  address: { ios: 'mappin.and.ellipse', material: 'location_on', glyph: 0xe0c8 },
  whatsapp: { ios: 'message', material: 'chat', glyph: 0xe0b7 },
  emergency: { ios: 'cross.case', material: 'medical_services', glyph: 0xf109 },
  copy: { ios: 'doc.on.doc', material: 'content_copy', glyph: 0xe14d },
  show: { ios: 'eye', material: 'visibility', glyph: 0xe8f4 },
  hide: { ios: 'eye.slash', material: 'visibility_off', glyph: 0xe8f5 },
  document: { ios: 'doc.text', material: 'description', glyph: 0xe873 },
  download: { ios: 'arrow.down.to.line', material: 'download', glyph: 0xf090 },
  nearby: { ios: 'location.circle', material: 'explore', glyph: 0xe87a },
  directions: { ios: 'location.fill', material: 'near_me', glyph: 0xe569 },
  chevronRight: { ios: 'chevron.right', material: 'chevron_right', glyph: 0xe5cc },
  chevronLeft: { ios: 'chevron.left', material: 'arrow_back_ios_new', glyph: 0xe2ea },
  chevronDown: { ios: 'chevron.down', material: 'expand_more', glyph: 0xe5cf },
  restaurant: { ios: 'fork.knife', material: 'restaurant', glyph: 0xe56c },
  supermarket: { ios: 'cart', material: 'shopping_cart', glyph: 0xe8cc },
  pharmacy: { ios: 'pills', material: 'local_pharmacy', glyph: 0xe550 },
  bakery: { ios: 'birthday.cake', material: 'bakery_dining', glyph: 0xea53 },
  cafe: { ios: 'cup.and.saucer', material: 'local_cafe', glyph: 0xe541 },
  mall: { ios: 'bag', material: 'shopping_bag', glyph: 0xf1cc },
  gym: { ios: 'dumbbell', material: 'fitness_center', glyph: 0xeb43 },
  laundry: { ios: 'washer', material: 'local_laundry_service', glyph: 0xe54a },
  bank: { ios: 'building.columns', material: 'account_balance', glyph: 0xe84f },
  hospital: { ios: 'cross', material: 'local_hospital', glyph: 0xe548 },
  school: { ios: 'graduationcap', material: 'school', glyph: 0xe80c },
  walk: { ios: 'figure.walk', material: 'directions_walk', glyph: 0xe536 },
  car: { ios: 'car', material: 'directions_car', glyph: 0xe531 },
  star: { ios: 'star.fill', material: 'star', glyph: 0xe838 },
  clock: { ios: 'clock', material: 'schedule', glyph: 0xe8b5 },
  phone: { ios: 'phone', material: 'call', glyph: 0xe0b0 },
  website: { ios: 'globe', material: 'language', glyph: 0xe894 },
  tip: { ios: 'lightbulb', material: 'lightbulb', glyph: 0xe0f0 },
  award: { ios: 'rosette', material: 'workspace_premium', glyph: 0xe7af },
  key: { ios: 'key', material: 'key', glyph: 0xe73c },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', material: 'logout', glyph: 0xe9ba },
  mail: { ios: 'envelope', material: 'mail', glyph: 0xe158 },
  close: { ios: 'xmark', material: 'close', glyph: 0xe5cd },
  check: { ios: 'checkmark', material: 'check', glyph: 0xe5ca },
  travel: { ios: 'airplane', material: 'flight', glyph: 0xe539 },
  bus: { ios: 'bus', material: 'directions_bus', glyph: 0xe530 },
  season: { ios: 'sun.max', material: 'wb_sunny', glyph: 0xe430 },
  map: { ios: 'map', material: 'map', glyph: 0xe55b },
  medal: { ios: 'medal.fill', material: 'military_tech', glyph: 0xea3f },
  checkCircle: { ios: 'checkmark.circle', material: 'check_circle', glyph: 0xe86c },
  wrench: { ios: 'wrench.and.screwdriver', material: 'build', glyph: 0xe869 },
  receipt: { ios: 'list.bullet.rectangle.portrait', material: 'receipt_long', glyph: 0xef6e },
  bell: { ios: 'bell', iosActive: 'bell.fill', material: 'notifications', glyph: 0xe7f4 },
  bellActive: { ios: 'bell.badge', material: 'notifications_active', glyph: 0xe7f7 },
  plus: { ios: 'plus', material: 'add', glyph: 0xe145 },
  calendarCheck: { ios: 'calendar.badge.checkmark', material: 'event_available', glyph: 0xe614 },
  calendarRepeat: { ios: 'calendar.badge.clock', material: 'event_repeat', glyph: 0xeb7b },
  rules: { ios: 'list.bullet.clipboard', material: 'gavel', glyph: 0xe90e },
  inventory: { ios: 'shippingbox', material: 'inventory_2', glyph: 0xe1a1 },
  people: { ios: 'person.2', material: 'group', glyph: 0xe7ef },
  personAdd: { ios: 'person.badge.plus', material: 'person_add', glyph: 0xe7fe },
  split: { ios: 'arrow.triangle.branch', material: 'call_split', glyph: 0xe0b6 },
  swap: { ios: 'arrow.left.arrow.right', material: 'swap_horiz', glyph: 0xe8d4 },
  trash: { ios: 'trash', material: 'delete', glyph: 0xe872 },
  camera: { ios: 'camera', material: 'photo_camera', glyph: 0xe412 },
  info: { ios: 'info.circle', material: 'info', glyph: 0xe88e },
  warning: { ios: 'exclamationmark.triangle', material: 'warning', glyph: 0xe002 },
  edit: { ios: 'pencil', material: 'edit', glyph: 0xe3c9 },
  sync: { ios: 'arrow.triangle.2.circlepath', material: 'sync', glyph: 0xe627 },
  qrCode: { ios: 'qrcode', material: 'qr_code_2', glyph: 0xe00a },
  idCard: { ios: 'person.text.rectangle', material: 'badge', glyph: 0xea67 },
  door: { ios: 'door.left.hand.open', material: 'door_open', glyph: 0xe77c },
  party: { ios: 'party.popper', material: 'celebration', glyph: 0xea65 },
  sparkles: { ios: 'sparkles', material: 'cleaning_services', glyph: 0xf0ff },
  taskDone: { ios: 'checkmark.seal', material: 'task_alt', glyph: 0xe2e6 },
  pending: { ios: 'hourglass', material: 'pending', glyph: 0xef64 },
  cancel: { ios: 'xmark.circle', material: 'cancel', glyph: 0xe5c9 },
  wallet: { ios: 'wallet.bifold', material: 'account_balance_wallet', glyph: 0xe850 },
  luggage: { ios: 'suitcase.rolling', material: 'luggage', glyph: 0xf235 },
  grill: { ios: 'flame', material: 'outdoor_grill', glyph: 0xea47 },
  folder: { ios: 'folder', material: 'folder', glyph: 0xe2c7 },
  shield: { ios: 'shield', material: 'shield', glyph: 0xe9e0 },
  review: { ios: 'text.bubble', material: 'rate_review', glyph: 0xe560 },
  minus: { ios: 'minus', material: 'remove', glyph: 0xe15b },
} as const satisfies Record<string, Entry>;

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  size = 20,
  color,
  active = false,
  style,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Filled variant on iOS (tab bar). */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const entry: Entry = REGISTRY[name];
  const tint = color ?? theme.text;

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={active && entry.iosActive ? entry.iosActive : entry.ios}
        weight={active ? 'medium' : 'regular'}
        tintColor={tint}
        size={size}
        style={style}
        accessibilityElementsHidden
      />
    );
  }

  return (
    <Text
      aria-hidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[
        { fontFamily: ICON_FONT, fontSize: size, lineHeight: size, width: size, height: size, color: tint },
        styles.glyph,
        style as StyleProp<TextStyle>,
      ]}>
      {String.fromCharCode(entry.glyph)}
    </Text>
  );
}

const styles = { glyph: { textAlign: 'center', overflow: 'hidden' } } as const;
