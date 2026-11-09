import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CharlotteFace } from '@/components/charlotte';
import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import { useNotices } from '@/lib/notices';
import { TourTarget } from '@/lib/tour';
import { trackAction } from '@/lib/usage';

const SIZE = 40;

/**
 * Top row of the tab screens (v3, 2026-11-08): the student's initials (profile), the question to the
 * assistant as the "search" of the app, and the notifications bell. `onPhoto` turns the three into
 * frosted pills for the arrival hero photo.
 */
export function TabHeader({ onPhoto = false }: { onPhoto?: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { student } = useHome();
  const { unread } = useNotices();

  // Dark glass: stays readable on a bright sky (no blur in React Native).
  const glass = { backgroundColor: 'rgba(20,20,26,0.34)' };
  const ink = onPhoto ? theme.onBrand : theme.text;

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t.today.profile}
        hitSlop={(TapTarget - SIZE) / 2}
        onPress={() => router.push('/profile')}
        style={[styles.round, onPhoto ? glass : { backgroundColor: theme.brand }]}>
        <AppText variant="callout" color={theme.onBrand} style={{ fontFamily: Fonts.bodySemi }}>
          {student.initials}
        </AppText>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t.today.ask}
        hitSlop={(TapTarget - SIZE) / 2}
        onPress={() => {
          trackAction('open_assistant', 'header');
          router.push('/assistant' as Href);
        }}
        style={[styles.ask, onPhoto ? glass : { backgroundColor: theme.surface }]}>
        <CharlotteFace size={22} />
        <AppText numberOfLines={1} color={onPhoto ? theme.onBrand : theme.textSecondary} style={{ flexShrink: 1 }}>
          {t.today.ask}
        </AppText>
      </PressableScale>

      <TourTarget id="bell">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t.notices.bell(unread)}
        hitSlop={(TapTarget - SIZE) / 2}
        onPress={() => router.push('/notices' as Href)}
        style={[styles.round, onPhoto ? glass : { backgroundColor: theme.surface }]}>
        <Icon name="bell" size={19} color={ink} />
        {unread > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.brand, borderColor: onPhoto ? theme.onBrand : theme.surface },
            ]}>
            <AppText variant="caption" color={theme.onBrand} style={styles.badgeText}>
              {unread > 9 ? '9+' : String(unread)}
            </AppText>
          </View>
        )}
      </PressableScale>
      </TourTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2 },
  round: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  ask: {
    flex: 1,
    height: SIZE,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 10,
    paddingRight: 14,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.bodySemi, fontSize: 11, lineHeight: 14 },
});
