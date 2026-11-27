import * as Clipboard from 'expo-clipboard';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { TabHeader } from '@/components/tab-header';
import { useToast } from '@/components/toast';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, MaxFontScale, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import type { Home } from '@/lib/home';
import { nightPlaces } from '@/lib/nightlife';
import { usePlaces } from '@/lib/places';
import { trackAction } from '@/lib/usage';

const HOME_PHOTO_HEIGHT = 200;

/** Fallback photo of the neighborhood while the apartment has none. */
export const NEIGHBORHOOD_PHOTO = getAttraction('praca-liberdade')?.photo;

/* ---------- Address ---------- */

const unitLabel = (complement: string) => (/^\d/.test(complement) ? `apto ${complement}` : complement);

/** The address as a driver or a delivery app needs it: street, number, unit, neighborhood, city. */
export function fullAddress(apartment: Home['apartment']) {
  return [apartment.address, apartment.complement && unitLabel(apartment.complement)].filter(Boolean).join(', ');
}

/** "R. Antônio de Albuquerque, 335" and "Apt 802 · Funcionários". */
function addressLines(apartment: Home['apartment'], unit: string) {
  const [street, ...rest] = apartment.address.replace(/[\s.,-]*Belo Horizonte.*$/, '').split(/\s+-\s+/);
  const neighborhood = rest.join(' – ');
  const unitText = apartment.complement ? (/^\d/.test(apartment.complement) ? `${unit} ${apartment.complement}` : apartment.complement) : '';
  // The apartment number gets its own line, as visible as the street (owner, 2026-11-27: "não só o número do prédio").
  return { street: street.trim(), unit: unitText, detail: neighborhood };
}

/**
 * "Chez vous" card (owner, 2026-11-27: "a aba inicial tá meio morta"): the apartment's own photos from the site in a
 * swipeable carousel, the address and the apartment number over them, and one tap opens Maison ("ao invés de um botão
 * Maison e Séjour, deixar só clicar no Chez vous"). Under it: copy the address, or show it big for a driver.
 */
export function AddressCard({ apartment }: { apartment: Home['apartment'] }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const { street, unit, detail } = addressLines(apartment, t.apartment.unit);
  const address = fullAddress(apartment);
  const photos = apartment.photos.length ? apartment.photos : apartment.photoUrl ? [apartment.photoUrl] : [];
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  async function copy() {
    await Clipboard.setStringAsync(address);
    trackAction('copy_address', 'home');
    toast(t.today.addressCopied);
  }
  function openHouse() {
    trackAction('open_maison', 'home');
    router.navigate('/maison');
  }

  const slide = (key: string, source: ImageSource | number | undefined) => (
    <Pressable key={key} accessibilityRole="button" accessibilityLabel={t.today.openTab(t.tabs.maison)} onPress={openHouse}>
      <Image source={source} style={{ width, height: HOME_PHOTO_HEIGHT }} contentFit="cover" transition={150} />
    </Pressable>
  );

  return (
    <View style={[styles.homeCard, Shadow.raised, { backgroundColor: theme.surface }]}>
      <View
        style={[styles.homePhoto, { backgroundColor: theme.fill }]}
        onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width > 0 &&
          (photos.length > 1 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={32}
              onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {photos.map((uri) => slide(uri, { uri }))}
            </ScrollView>
          ) : (
            slide('one', photos[0] ? { uri: photos[0] } : NEIGHBORHOOD_PHOTO)
          ))}
        <LinearGradient
          colors={['transparent', theme.scrim, theme.scrim]}
          locations={[0, 0.6, 1]}
          style={styles.homeShade}
          pointerEvents="none"
        />
        <View style={[styles.homePill, { backgroundColor: theme.surface }]} pointerEvents="none">
          <Icon name="sofa" size={14} color={theme.text} />
          <AppText variant="caption" maxFontSizeMultiplier={MaxFontScale} style={{ fontFamily: Fonts.bodySemi }}>
            {t.today.myHome}
          </AppText>
          <Icon name="chevronRight" size={12} color={theme.textSecondary} />
        </View>
        <View style={styles.homeText} pointerEvents="none">
          <AppText variant="caption" color={theme.onBrand} style={{ opacity: 0.85 }}>
            {t.today.chezVous}
          </AppText>
          <AppText variant="title" color={theme.onBrand}>
            {street}
          </AppText>
          {!!unit && (
            <AppText color={theme.onBrand} style={{ fontFamily: Fonts.bodySemi }}>
              {unit}
            </AppText>
          )}
          {!!detail && (
            <AppText variant="caption" color={theme.onBrand} style={{ opacity: 0.85 }}>
              {detail}
            </AppText>
          )}
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((uri, i) => (
                <View
                  key={uri}
                  style={[styles.dot, { backgroundColor: theme.onBrand, opacity: i === page ? 1 : 0.45 }, i === page && styles.dotOn]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.homeActions}>
        <AddressButton label={t.today.copyAddress} a11y={t.today.copyAddress} icon="copy" onPress={copy} />
        <AddressButton
          label={t.today.forDriver}
          a11y={t.today.showA11y}
          icon="car"
          onPress={() => {
            trackAction('show_address', 'home');
            router.push('/address' as Href);
          }}
        />
      </View>
    </View>
  );
}

function AddressButton({ label, a11y, icon, onPress }: { label: string; a11y: string; icon: IconName; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.addressButton, { backgroundColor: theme.background }]}>
      <Icon name={icon} size={16} color={theme.text} />
      <AppText variant="callout" maxFontSizeMultiplier={MaxFontScale} style={{ fontFamily: Fonts.bodySemi, flexShrink: 1 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/* ---------- Quick actions ---------- */

const QUICK_FONT_SCALE = 1.2;

export function QuickActions({ apartment }: { apartment: Home['apartment'] }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();

  async function wifi() {
    if (!apartment.wifiPassword) return router.push('/maison');
    await Clipboard.setStringAsync(apartment.wifiPassword);
    trackAction('copy_wifi', 'home');
    toast(t.today.wifiCopied);
  }

  // Each shortcut in its own tint (2026-11-27: "a aba inicial tá meio morta"), SOS stays the red one.
  const actions: { icon: IconName; label: string; a11y?: string; onPress: () => void; sos?: boolean; tint: string; ink: string }[] = [
    { icon: 'wifi', label: t.today.quick.wifi, onPress: wifi, tint: theme.infoSoft, ink: theme.info },
    {
      icon: 'laundry',
      label: t.today.quick.services,
      a11y: t.requests.homeNew,
      onPress: () => router.push('/requests/new' as Href),
      tint: theme.warningSoft,
      ink: theme.warning,
    },
    {
      icon: 'people',
      label: t.today.quick.roommates,
      onPress: () => router.push('/apartment/roommates'),
      tint: theme.successSoft,
      ink: theme.success,
    },
    { icon: 'shield', label: t.today.quick.sos, onPress: () => router.push('/emergency'), sos: true, tint: theme.brandSoft, ink: theme.brand },
  ];

  return (
    <View style={styles.quickRow}>
      {actions.map((a) => (
        <PressableScale
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.a11y ?? a.label}
          onPress={a.onPress}
          style={styles.quick}>
          <View style={[styles.quickCircle, { backgroundColor: a.tint }]}>
            <Icon name={a.icon} size={22} color={a.ink} />
          </View>
          <AppText
            variant="caption"
            color={a.sos ? theme.brandText : theme.text}
            // Four labels share the width of the screen: a lower cap keeps "Roommates" in one piece.
            maxFontSizeMultiplier={QUICK_FONT_SCALE}
            style={{ fontFamily: a.sos ? Fonts.bodySemi : Fonts.bodyMedium, textAlign: 'center' }}>
            {a.label}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

/* ---------- Tonight in BH ---------- */

/** Bars with a team photo, closest to the apartment first. */
/** Belo Horizonte is UTC−3 all year (no daylight saving). */
const BH_OFFSET_MS = 3 * 3_600_000;
const EVENING_FROM_HOUR = 17;
const NIGHT_UNTIL_HOUR = 5;

/**
 * Is it the evening in Belo Horizonte (17:00 to 04:59), whatever the phone's time zone? The carousel below shows
 * the same bars and clubs all day, so on Accueil only its title follows the clock: "Sortir à BH" by day,
 * "Ce soir à BH" from 17:00 (UX review 2026-11-10: "Ce soir" at 9 in the morning read wrong).
 */
export function isEveningInBh(now = Date.now()) {
  const hour = new Date(now - BH_OFFSET_MS).getUTCHours();
  return hour >= EVENING_FROM_HOUR || hour < NIGHT_UNTIL_HOUR;
}

/** The team's bars and clubs with a photo, closest to the apartment first (the same list all day). */
export function TonightCarousel() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const times = usePlaces()?.times;

  const places = nightPlaces
    .filter((p) => p.photo != null)
    .map((p) => ({ place: p, walk: times?.[p.placeId]?.walkMin, drive: times?.[p.placeId]?.driveMin }))
    .sort((a, b) => (a.walk ?? Infinity) - (b.walk ?? Infinity))
    .slice(0, 6);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.carousel}>
      {places.map(({ place: p, walk, drive }) => (
        <PressableScale
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.vibe[lang]}`}
          onPress={() => router.push({ pathname: '/nightlife/[id]', params: { id: p.id } })}
          style={styles.tonightCard}>
          <Image source={p.photo} style={[styles.tonightPhoto, { backgroundColor: theme.fill }]} contentFit="cover" />
          <View style={{ gap: 1, paddingHorizontal: 2 }}>
            <AppText style={{ fontFamily: Fonts.bodySemi }}>{p.name}</AppText>
            <AppText variant="caption" color={theme.textSecondary}>
              {[p.vibe[lang], walk != null && (walk <= 20 || drive == null ? t.today.walk(walk) : t.today.drive(drive))]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/* ---------- Rows with a tinted icon circle (Revolut-like) ---------- */

export function TintCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.tintCard, Shadow.card, { backgroundColor: theme.surface }]}>{children}</View>;
}

export function TintRow({
  icon,
  emoji,
  image,
  tint,
  ink,
  title,
  subtitle,
  subtitleColor,
  done = false,
  accessory,
  onPress,
  first = false,
}: {
  icon?: IconName;
  emoji?: string;
  /** An app logo or a photo instead of the tinted circle. */
  image?: number;
  tint: string;
  ink: string;
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  done?: boolean;
  accessory?: ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <>
      {image != null && !done ? (
        <Image source={image} style={styles.rowImage} contentFit="cover" accessible={false} />
      ) : (
      <View style={[styles.tintCircle, { backgroundColor: done ? theme.success : tint }]}>
        {done ? (
          <Icon name="check" size={18} color={theme.onBrand} />
        ) : emoji ? (
          <AppText style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</AppText>
        ) : (
          icon && <Icon name={icon} size={19} color={ink} />
        )}
      </View>
      )}
      <View style={{ flex: 1, gap: 2, opacity: done ? 0.55 : 1 }}>
        <AppText
          style={{ fontFamily: Fonts.bodySemi, textDecorationLine: done ? 'line-through' : 'none' }}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="caption" color={subtitleColor ?? theme.textSecondary}>
            {subtitle}
          </AppText>
        )}
      </View>
      {accessory ?? (onPress && <Icon name="chevronRight" size={15} color={theme.textTertiary} />)}
    </>
  );
  const rowStyle = [styles.tintRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }];
  return onPress ? (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={rowStyle}>
      {body}
    </PressableScale>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

/** Small pill on the right of a row: red for the main action, gray otherwise. */
export function RowPill({
  label,
  onPress,
  primary = false,
  dark = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  dark?: boolean;
}) {
  const theme = useTheme();
  const bg = primary ? theme.brand : dark ? theme.text : theme.background;
  const fg = primary || dark ? theme.onBrand : theme.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={[styles.rowPill, { backgroundColor: bg }]}>
      <AppText variant="callout" color={fg} maxFontSizeMultiplier={MaxFontScale} style={{ fontFamily: Fonts.bodySemi }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/* ---------- Arrival hero ---------- */

/** Full-bleed photo with the top row on it and the welcome over a dark gradient (Airbnb-like). */
export function WelcomeHero({ apartment, badge, title }: { apartment: Home['apartment']; badge: string; title: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { detail } = addressLines(apartment, t.apartment.unit);

  return (
    <View style={[styles.hero, { height: 300 + insets.top }]}>
      <Image
        source={apartment.photoUrl ? { uri: apartment.photoUrl } : NEIGHBORHOOD_PHOTO}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.32, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroInner, { paddingTop: insets.top + Spacing.sm }]}>
        <TabHeader onPhoto />
        <View style={{ gap: 6 }}>
          <View style={[styles.badge, { backgroundColor: theme.surface }]}>
            <AppText variant="caption" color={theme.brand} style={{ fontFamily: Fonts.bodySemi }}>
              {badge}
            </AppText>
          </View>
          <AppText variant="display" color={theme.onBrand}>
            {title}
          </AppText>
          {!!detail && <AppText color="rgba(255,255,255,0.88)">{detail}</AppText>}
        </View>
      </View>
      {/* The canvas starts as a sheet with rounded corners over the photo. */}
      <View style={[styles.sheetLip, { backgroundColor: theme.background }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  homeCard: { borderRadius: Radius.xl, overflow: 'hidden' },
  homePhoto: { height: HOME_PHOTO_HEIGHT, overflow: 'hidden' },
  homeShade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '35%' },
  homeText: { position: 'absolute', left: 16, right: 16, bottom: 12, gap: 1 },
  homePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  dots: { flexDirection: 'row', gap: 4, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { width: 16 },
  homeActions: { flexDirection: 'row', gap: 8, padding: 12 },
  addressButton: {
    flex: 1,
    minHeight: TapTarget,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  quickRow: { flexDirection: 'row' },
  quick: { flex: 1, alignItems: 'center', gap: 6 },
  quickCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -Spacing.gutter },
  carousel: { paddingHorizontal: Spacing.gutter, gap: 12 },
  tonightCard: { width: 230, gap: 8 },
  tonightPhoto: { width: 230, height: 130, borderRadius: 18 },
  tintCard: { borderRadius: Radius.lg, paddingHorizontal: 14 },
  tintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  tintCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowImage: { width: 44, height: 44, borderRadius: 12 },
  rowPill: { minHeight: 34, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', overflow: 'hidden' },
  heroInner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 44,
    justifyContent: 'space-between',
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  sheetLip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 26,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
});
