import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Avatar, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';

export default function RoommatesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { roommates } = useHome();
  return (
    <Screen back title={t.apartment.roommates} subtitle={t.apartment.roommatesHint}>
      <Card style={{ gap: Spacing.md }}>
        {roommates.map((r, i) => (
          <View key={r.fullName}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
            <View style={styles.row}>
              <Avatar initials={r.initials} size={48} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: Fonts.bodyMedium }}>{r.fullName}</AppText>
                <AppText variant="callout" color={theme.textSecondary}>
                  {t.apartment.roommateLabel}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
