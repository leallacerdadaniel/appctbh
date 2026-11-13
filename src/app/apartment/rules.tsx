import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/**
 * House rules from the Cartilha: quiet hours, what is forbidden, toilet, deposit, reminders, contacts;
 * a question left? The assistant knows the rules (row at the end).
 */
export default function RulesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const r = t.apartment.rules;

  return (
    <Screen back title={r.screenTitle}>
      {/* The same intro every student signs on first launch; signing again changes nothing. */}
      <Card style={styles.listCard}>
        <ListRow
          icon="handshake"
          title={t.rulesIntro.replay}
          subtitle={t.rulesIntro.replayHint}
          onPress={() => router.push('/rules-intro' as Href)}
        />
      </Card>

      <Section title={r.quietTitle}>
        <Card style={{ gap: 2 }}>
          <AppText variant="display">{r.quietHours}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {r.quietNote}
          </AppText>
        </Card>
      </Section>

      {/* The one rule foreigners don't expect, and it can cost them money: before the list. */}
      <Card style={[styles.warning, { backgroundColor: theme.errorSoft }]}>
        <Icon name="warning" size={20} color={theme.error} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText color={theme.error} style={{ fontFamily: Fonts.bodyMedium }}>
            {r.toiletTitle}
          </AppText>
          <AppText variant="callout" color={theme.error}>
            {r.toiletText}
          </AppText>
        </View>
      </Card>

      <Section title={r.forbiddenTitle}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {r.forbidden.map((rule) => (
              <ListRow key={rule.title} icon="close" title={rule.title} subtitle={rule.detail} />
            ))}
          </ListGroup>
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

      <Card style={styles.listCard}>
        <ListRow
          icon="assistant"
          title={r.question}
          subtitle={r.questionHint}
          onPress={() => router.push('/assistant' as Href)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
