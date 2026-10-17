import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** Gold medal + "Incontournable": the team's must-go places in Explorer. White pill, readable on any photo. */
export function MustGoBadge() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.badge, { backgroundColor: theme.surface }]}>
      <Icon name="medal" size={14} color={theme.gold} />
      <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
        {t.explore.mustGo}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingLeft: 6,
    paddingRight: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
});
