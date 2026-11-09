import { router } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Avatar, Button, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';

/** Who lives in the apartment with the student (Maison › Entre colocataires). Chores will come here later. */
export default function RoommatesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { roommates } = useHome();

  return (
    <Screen back title={t.roommates.title} subtitle={t.roommates.subtitle}>
      {roommates.length === 0 ? (
        <Card>
          <AppText color={theme.textSecondary}>{t.roommates.empty}</AppText>
        </Card>
      ) : (
        <>
          <Card style={styles.list}>
            {roommates.map((r, i) => (
              <Fragment key={`${r.fullName}-${i}`}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
                <View style={styles.row}>
                  <Avatar initials={r.initials} size={40} />
                  <AppText style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>{r.fullName}</AppText>
                </View>
              </Fragment>
            ))}
          </Card>
          <Card style={{ gap: Spacing.md }}>
            <AppText variant="callout" color={theme.textSecondary}>
              {t.roommates.expensesHint}
            </AppText>
            <Button variant="secondary" label={t.expenses.title} onPress={() => router.push('/expenses')} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 40 + Spacing.md },
});
