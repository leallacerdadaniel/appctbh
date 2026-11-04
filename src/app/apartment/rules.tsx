import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** House rules from the Cartilha: quiet hours, what is forbidden, toilet, deposit, reminders, contacts. */
export default function RulesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const r = t.apartment.rules;

  return (
    <Screen back title={r.screenTitle} subtitle={r.subtitle}>
      <Section title={r.quietTitle}>
        <Card style={{ gap: 2 }}>
          <AppText variant="display">{r.quietHours}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {r.quietNote}
          </AppText>
        </Card>
      </Section>

      <Section title={r.forbiddenTitle} subtitle={r.forbiddenIntro}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {r.forbidden.map((rule) => (
              <ListRow key={rule} icon="close" title={rule} />
            ))}
          </ListGroup>
        </Card>
      </Section>

      <Section title={r.toiletTitle}>
        <Card style={{ gap: Spacing.md, backgroundColor: theme.errorSoft }}>
          <View style={styles.warning}>
            <Icon name="warning" size={20} color={theme.error} />
            <AppText variant="callout" color={theme.error} style={{ flex: 1 }}>
              {r.toiletWarning}
            </AppText>
          </View>
          <AppText variant="callout" color={theme.textSecondary}>
            {r.toiletWhy}
          </AppText>
        </Card>
      </Section>

      <Section title={r.remindersTitle}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {r.reminders.map((reminder) => (
              <ListRow key={reminder} icon="checkCircle" title={reminder} />
            ))}
          </ListGroup>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
