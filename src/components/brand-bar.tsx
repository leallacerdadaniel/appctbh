import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/**
 * Red bar with the white logo, on top of every screen (DUO reference: references/duo.md).
 * Logo only (owner, 2026-10-16); pushed screens add a back arrow on the left.
 */
export function BrandBar({ back = false }: { back?: boolean }) {
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
        </View>

        <View style={styles.side} />
      </View>
    </View>
  );
}

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
  back: {
    width: TapTarget,
    height: TapTarget,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
