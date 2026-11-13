import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusStatusBar } from '@/components/focus-status-bar';
import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Brand, Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useNotices } from '@/lib/notices';

/** Height of the bar under the status bar; `Screen` pads its content by this plus the top inset. */
export const BRAND_BAR_HEIGHT = 56;

/**
 * Red bar with the white logo, on top of every screen (DUO reference: references/duo.md).
 * Pushed screens have a back arrow on the left; tab screens have the SOS button there instead
 * (owner, 2026-11-08) and the notifications bell on the right.
 * Shape (owner, 2026-11-09: "plain assim tá feio"): rounded bottom corners and a soft red shadow; with
 * `overlay`, it floats over the screen so the content scrolls under the curve instead of being cut flat.
 */
export function BrandBar({
  back = false,
  sos = false,
  bell = false,
  overlay = false,
}: {
  back?: boolean;
  sos?: boolean;
  bell?: boolean;
  overlay?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={[styles.shell, overlay && styles.overlay, { backgroundColor: theme.brand, paddingTop: insets.top }]}>
      {/* Brand red to deep wine on the diagonal, plus a faint light at the top for depth (2026-11-09). */}
      <LinearGradient
        colors={Brand.barGradient}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.fill}
        pointerEvents="none"
      />
      <FocusStatusBar style="light" />
      <View style={styles.bar}>
        {/* Logo centered on the bar itself, whatever the side contents are. */}
        <View pointerEvents="none" style={styles.logoSlot}>
          <Image
            source={require('@/assets/brand/logo-wordmark-white.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Chez Toi BH"
          />
        </View>

        <View style={styles.side}>
          {back && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.common.back}
              hitSlop={BACK_SLOP}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={[styles.back, { backgroundColor: theme.onBrandTrack }]}>
              <Icon name="chevronLeft" size={20} color={theme.onBrand} />
            </PressableScale>
          )}
          {sos && !back && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.emergency.title}
              hitSlop={SOS_SLOP}
              onPress={() => router.push('/emergency')}
              style={[styles.sos, { backgroundColor: theme.onBrandTrack }]}>
              <Icon name="emergency" size={16} color={theme.onBrand} />
              <AppText variant="callout" color={theme.onBrand} style={{ fontFamily: Fonts.bodyMedium }}>
                {t.common.sos}
              </AppText>
            </PressableScale>
          )}
        </View>

        <View style={[styles.side, styles.right]}>{bell && !back && <NoticesBell />}</View>
      </View>
    </View>
  );
}

/** White bell, 44 pt, with the number of unread notices in a white badge. Opens /notices. */
function NoticesBell() {
  const theme = useTheme();
  const { t } = useI18n();
  const { unread } = useNotices();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.notices.bell(unread)}
      onPress={() => router.push('/notices' as Href)}
      style={styles.bell}>
      <Icon name="bell" size={22} color={theme.onBrand} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.onBrand, borderColor: theme.brand }]}>
          <AppText variant="caption" color={theme.brand} style={styles.badgeText}>
            {unread > 9 ? '9+' : String(unread)}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const SOS_HEIGHT = 32;
const BACK_SIZE = 36;
/** The light circle is 36 pt; the touch area is 44 pt. */
const BACK_SLOP = (TapTarget - BACK_SIZE) / 2;
const CURVE = 24;
/** The pill stays light on the bar; the touch area is 44 pt tall. */
const SOS_SLOP = { top: (TapTarget - SOS_HEIGHT) / 2, bottom: (TapTarget - SOS_HEIGHT) / 2, left: 4, right: 4 };

const styles = StyleSheet.create({
  shell: {
    borderBottomLeftRadius: CURVE,
    borderBottomRightRadius: CURVE,
    boxShadow: '0 8px 22px rgba(120, 5, 16, 0.28)',
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  /** Fills the bar under its content, with the bar's curve (the shell can't clip: it would cut its shadow). */
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: CURVE,
    borderBottomRightRadius: CURVE,
  },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    height: BRAND_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  logoSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 118, height: 28 },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: SOS_HEIGHT,
    minWidth: TapTarget,
    paddingHorizontal: 12,
    marginLeft: -4,
    borderRadius: Radius.pill,
  },
  bell: {
    width: TapTarget,
    height: TapTarget,
    marginRight: -11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.bodyMedium, lineHeight: 14 },
  back: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    marginLeft: -4,
    borderRadius: BACK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
