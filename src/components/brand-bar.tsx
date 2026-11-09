import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useNotices } from '@/lib/notices';

/**
 * Red bar with the white logo, on top of every screen (DUO reference: references/duo.md).
 * Pushed screens have a back arrow on the left; tab screens have the SOS button there instead
 * (owner, 2026-11-08) and the notifications bell on the right.
 */
export function BrandBar({
  back = false,
  sos = false,
  bell = false,
}: {
  back?: boolean;
  sos?: boolean;
  bell?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={{ backgroundColor: theme.brand, paddingTop: insets.top }}>
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
              hitSlop={8}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.back}>
              <Icon name="chevronLeft" size={22} color={theme.onBrand} />
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
/** The pill stays light on the bar; the touch area is 44 pt tall. */
const SOS_SLOP = { top: (TapTarget - SOS_HEIGHT) / 2, bottom: (TapTarget - SOS_HEIGHT) / 2, left: 4, right: 4 };

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    height: 56,
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
    width: TapTarget,
    height: TapTarget,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
