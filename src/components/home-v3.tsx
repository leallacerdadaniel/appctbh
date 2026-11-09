import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { TabHeader } from '@/components/tab-header';
import { useToast } from '@/components/toast';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import type { Home } from '@/lib/home';
import { nightPlaces } from '@/lib/nightlife';
import { usePlaces } from '@/lib/places';
import { appUrl, getService } from '@/lib/services';
import { trackAction } from '@/lib/usage';

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
  return { street: street.trim(), detail: [unitText, neighborhood].filter(Boolean).join(' · ') };
}

/**
 * "Chez vous" card (v3): what the student needs every time they go home — Uber and 99 with the address as
 * destination, copy it for a delivery app, or show it full screen to a driver.
 */
export function AddressCard({ apartment }: { apartment: Home['apartment'] }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const { street, detail } = addressLines(apartment, t.apartment.unit);
  const address = fullAddress(apartment);

  async function copy() {
    await Clipboard.setStringAsync(address);
    trackAction('copy_address', 'home');
    toast(t.today.addressCopied);
  }

  function uber() {
    trackAction('open_uber', 'home');
    const q = `action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}&dropoff[nickname]=${encodeURIComponent('Chez Toi')}`;
    Linking.openURL(`https://m.uber.com/ul/?${q}`);
  }

  async function ninetyNine() {
    // 99 has no public link with a destination: copy the address, then open the app's store page.
    await Clipboard.setStringAsync(address);
    trackAction('open_99', 'home');
    toast(t.today.pasteIn99);
    const app = getService('99');
    if (app) Linking.openURL(appUrl(app));
  }

  const uberLogo = getService('uber')?.logo;
  const ninetyNineLogo = getService('99')?.logo;

  return (
    <View style={[styles.addressCard, Shadow.raised, { backgroundColor: theme.surface }]}>
      <View style={styles.addressTop}>
        <Image
          source={apartment.photoUrl ? { uri: apartment.photoUrl } : NEIGHBORHOOD_PHOTO}
          style={[styles.thumb, { backgroundColor: theme.fill }]}
          contentFit="cover"
          accessible={false}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.today.chezVous}
          </AppText>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{street}</AppText>
          {!!detail && (
            <AppText variant="caption" color={theme.textSecondary}>
              {detail}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.addressActions}>
        <AddressButton label={t.today.uber} a11y={t.today.uberA11y} logo={uberLogo} onPress={uber} />
        <AddressButton label={t.today.ninetyNine} a11y={t.today.ninetyNineA11y} logo={ninetyNineLogo} onPress={ninetyNine} />
        <AddressButton label={t.today.copy} a11y={t.today.addressCopied} icon="copy" onPress={copy} />
        <AddressButton
          label={t.today.show}
          a11y={t.today.showA11y}
          icon="show"
          onPress={() => {
            trackAction('show_address', 'home');
            router.push('/address' as Href);
          }}
        />
      </View>
    </View>
  );
}

function AddressButton({
  label,
  a11y,
  logo,
  icon,
  onPress,
}: {
  label: string;
  a11y: string;
  logo?: number;
  icon?: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.addressButton, { backgroundColor: theme.background }]}>
      {logo ? (
        <Image source={logo} style={styles.logo} contentFit="cover" accessible={false} />
      ) : (
        icon && <Icon name={icon} size={15} color={theme.text} />
      )}
      <AppText variant="callout" style={{ fontFamily: Fonts.bodySemi }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/* ---------- Quick actions ---------- */

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

  const actions: { icon: IconName; label: string; onPress: () => void; sos?: boolean }[] = [
    { icon: 'wifi', label: t.today.quick.wifi, onPress: wifi },
    { icon: 'laundry', label: t.today.quick.services, onPress: () => router.push('/requests/new' as Href) },
    { icon: 'people', label: t.today.quick.roommates, onPress: () => router.push('/apartment/roommates') },
    { icon: 'shield', label: t.today.quick.sos, onPress: () => router.push('/emergency'), sos: true },
  ];

  return (
    <View style={styles.quickRow}>
      {actions.map((a) => (
        <PressableScale
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={a.onPress}
          style={styles.quick}>
          <View style={[styles.quickCircle, { backgroundColor: a.sos ? theme.brandSoft : theme.surface }]}>
            <Icon name={a.icon} size={22} color={a.sos ? theme.brand : theme.text} />
          </View>
          <AppText
            variant="caption"
            color={a.sos ? theme.brand : theme.text}
            style={{ fontFamily: a.sos ? Fonts.bodySemi : Fonts.bodyMedium }}>
            {a.label}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

/* ---------- Tonight in BH ---------- */

/** Bars with a team photo, closest to the apartment first. */
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
      <AppText variant="callout" color={fg} style={{ fontFamily: Fonts.bodySemi }}>
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
  addressCard: { borderRadius: Radius.xl, padding: 14, gap: 12 },
  addressTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 14 },
  addressActions: { flexDirection: 'row', gap: 6 },
  addressButton: {
    flex: 1,
    minHeight: TapTarget - 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  logo: { width: 18, height: 18, borderRadius: 5 },
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
