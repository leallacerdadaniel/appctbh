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
  chevronUp: { ios: 'chevron.up', material: 'expand_less', glyph: 0xe5ce },
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
  map: { ios: 'map', iosActive: 'map.fill', material: 'map', glyph: 0xe55b },
  medal: { ios: 'medal.fill', material: 'military_tech', glyph: 0xea3f },
  checkCircle: { ios: 'checkmark.circle', material: 'check_circle', glyph: 0xe86c },
  warning: { ios: 'exclamationmark.triangle', material: 'warning', glyph: 0xe002 },
  cake: { ios: 'birthday.cake', material: 'cake', glyph: 0xe7e9 },
  wrench: { ios: 'wrench.and.screwdriver', material: 'build', glyph: 0xe869 },
  luggage: { ios: 'suitcase.rolling', material: 'luggage', glyph: 0xf235 },
  grill: { ios: 'flame', material: 'outdoor_grill', glyph: 0xea47 },
  receipt: {
    ios: 'list.bullet.rectangle.portrait',
    iosActive: 'list.bullet.rectangle.portrait.fill',
    material: 'receipt_long',
    glyph: 0xef6e,
  },
  plus: { ios: 'plus', material: 'add', glyph: 0xe145 },
  minus: { ios: 'minus', material: 'remove', glyph: 0xe15b },
  camera: { ios: 'camera', material: 'photo_camera', glyph: 0xe412 },
  photo: { ios: 'photo.on.rectangle', material: 'photo_library', glyph: 0xe413 },
  info: { ios: 'info.circle', material: 'info', glyph: 0xe88e },
  wallet: { ios: 'creditcard', material: 'account_balance_wallet', glyph: 0xe850 },
  people: { ios: 'person.2', material: 'group', glyph: 0xe7ef },
  bell: { ios: 'bell', material: 'notifications', glyph: 0xe7f4 },
  send: { ios: 'arrow.up', material: 'arrow_upward', glyph: 0xe5d8 },
  swap: { ios: 'arrow.left.arrow.right', material: 'swap_horiz', glyph: 0xe8d4 },
  assistant: { ios: 'questionmark.bubble', material: 'contact_support', glyph: 0xe94c },
  edit: { ios: 'pencil', material: 'edit', glyph: 0xe3c9 },
  circle: { ios: 'circle', material: 'radio_button_unchecked', glyph: 0xe836 },
  checkCircleFill: { ios: 'checkmark.circle.fill', material: 'check_circle', glyph: 0xe86c },
  chores: { ios: 'checklist', material: 'checklist', glyph: 0xe6b1 },
  pix: { ios: 'brazilianrealsign.circle', material: 'pix', glyph: 0xeaa3 },
  retry: { ios: 'arrow.clockwise', material: 'refresh', glyph: 0xe5d5 },
  // v3 navigation (2026-11-08): Accueil · Explorer · Assistant · Maison · Séjour.
  explore: { ios: 'safari', iosActive: 'safari.fill', material: 'explore', glyph: 0xe87a },
  sofa: { ios: 'sofa', iosActive: 'sofa.fill', material: 'weekend', glyph: 0xe16b },
  stay: { ios: 'suitcase', iosActive: 'suitcase.fill', material: 'luggage', glyph: 0xf235 },
  sparkles: { ios: 'sparkles', material: 'auto_awesome', glyph: 0xe65f },
  heart: { ios: 'heart', iosActive: 'heart.fill', material: 'favorite', glyph: 0xe87d },
  bar: { ios: 'wineglass', material: 'local_bar', glyph: 0xe540 },
  culture: { ios: 'theatermasks', material: 'theater_comedy', glyph: 0xea66 },
  sport: { ios: 'soccerball', material: 'sports_soccer', glyph: 0xea2f },
  apps: { ios: 'square.grid.2x2', material: 'apps', glyph: 0xe5c3 },
  shield: { ios: 'exclamationmark.shield', material: 'emergency', glyph: 0xe1eb },
  // On m'a volé mon téléphone (2026-11-08).
  phoneLock: { ios: 'lock.iphone', material: 'phonelink_lock', glyph: 0xe0dc },
  phoneOff: { ios: 'iphone.slash', material: 'mobile_off', glyph: 0xe201 },
  simCard: { ios: 'simcard', material: 'sim_card', glyph: 0xe32b },
  shieldLock: { ios: 'lock.shield', material: 'shield_lock', glyph: 0xf686 },
  cardOff: { ios: 'creditcard.trianglebadge.exclamationmark', material: 'credit_card_off', glyph: 0xe4f4 },
  police: { ios: 'checkmark.shield', material: 'local_police', glyph: 0xef56 },
  imei: { ios: 'number', material: 'tag', glyph: 0xe9ef },
  laptop: { ios: 'laptopcomputer', material: 'laptop', glyph: 0xe31e },
  // House rules intro (2026-11-08).
  moon: { ios: 'moon.zzz', material: 'bedtime', glyph: 0xef44 },
  party: { ios: 'party.popper', material: 'celebration', glyph: 0xea65 },
  trash: { ios: 'trash', material: 'delete', glyph: 0xe872 },
  noSmoking: { ios: 'nosign', material: 'smoke_free', glyph: 0xeb4a },
  hanger: { ios: 'hanger', material: 'checkroom', glyph: 0xf19e },
  lock: { ios: 'lock', material: 'lock', glyph: 0xe897 },
  handshake: { ios: 'hand.raised', material: 'handshake', glyph: 0xebcb },
  // Visites, colis et profils des colocs (2026-11-08).
  visitor: { ios: 'person.badge.plus', material: 'person_add', glyph: 0xe7fe },
  door: { ios: 'door.left.hand.open', material: 'door_front', glyph: 0xeffd },
  parcel: { ios: 'shippingbox', iosActive: 'shippingbox.fill', material: 'package_2', glyph: 0xf569 },
  idCard: { ios: 'person.text.rectangle', material: 'id_card', glyph: 0xf4ca },
  // Agenda de BH (2026-11-09).
  music: { ios: 'music.note', material: 'music_note', glyph: 0xe405 },
  exhibition: { ios: 'photo.artframe', material: 'palette', glyph: 0xe40a },
  festival: { ios: 'tent', material: 'festival', glyph: 0xea68 },
  ticket: { ios: 'ticket', material: 'confirmation_number', glyph: 0xe638 },
  external: { ios: 'arrow.up.right.square', material: 'open_in_new', glyph: 0xe89e },
  // Parler portugais (2026-11-08).
  speaker: { ios: 'speaker.wave.2', iosActive: 'speaker.wave.2.fill', material: 'volume_up', glyph: 0xe050 },
  slow: { ios: 'tortoise', material: 'slow_motion_video', glyph: 0xe068 },
  streak: { ios: 'flame.fill', material: 'local_fire_department', glyph: 0xef55 },
  translate: { ios: 'character.bubble', material: 'translate', glyph: 0xe8e2 },
  // Mon semestre à BH (2026-11-08): "J'y suis allé" check-ins, the recap entry and its share button.
  visited: { ios: 'flag', iosActive: 'flag.fill', material: 'flag', glyph: 0xe153 },
  play: { ios: 'play.fill', material: 'play_arrow', glyph: 0xe037 },
  share: { ios: 'square.and.arrow.up', material: 'ios_share', glyph: 0xe6b8 },
  // Onda 14 (2026-11-09): avis à l'équipe, parrainage.
  feedback: { ios: 'text.bubble', material: 'rate_review', glyph: 0xe560 },
  gift: { ios: 'gift', material: 'redeem', glyph: 0xe8b1 },
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
