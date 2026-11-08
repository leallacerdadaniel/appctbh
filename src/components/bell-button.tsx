import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/index';
import { unreadNotices } from '@/store/selectors';

/**
 * The bell: opens the notices inbox, with the unread count in a badge.
 * `tone="onBrand"` (white) on the red brand bar, `tone="neutral"` on the gray canvas.
 */
export function BellButton({ tone = 'neutral' }: { tone?: 'onBrand' | 'neutral' }) {
  const theme = useTheme();
  const { t } = useI18n();
  const unread = useStore(unreadNotices);
  const onBrand = tone === 'onBrand';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.reminders.bellLabel(unread)}
      onPress={() => router.push('/notices' as Href)}
      style={styles.button}>
      <Icon name={unread > 0 ? 'bellActive' : 'bell'} size={22} color={onBrand ? theme.onBrand : theme.text} />
      {unread > 0 && (
        <View
          style={[
            styles.badge,
            onBrand
              ? { backgroundColor: theme.onBrand, borderColor: theme.brand }
              : { backgroundColor: theme.brand, borderColor: theme.background },
          ]}>
          <AppText
            variant="caption"
            color={onBrand ? theme.brand : theme.onBrand}
            style={styles.badgeText}
            allowFontScaling={false}>
            {unread > 9 ? '9+' : String(unread)}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.bodyMedium, fontSize: 11, lineHeight: 13 },
});
