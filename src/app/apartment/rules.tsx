import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { TintCard, TintRow } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** One icon per line of "Ce qui rend la vie facile ici", in the order of the strings. */
const GOOD_ICONS: IconName[] = ['whatsapp', 'cleaning', 'party', 'handshake', 'sparkles'];

/**
 * House rules from the Cartilha. The good side comes first and the rest is not all red (owner, 2026-11-27:
 * "pra não ficar tudo muito vermelho"): green for what the stay gives, amber for the toilet warning, gray for what
 * is not allowed, blue for the reminders. A question left? The assistant knows the rules (row at the end).
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

      <Section title={r.goodTitle}>
        <TintCard>
          {r.good.map((item, i) => (
            <TintRow
              key={item.title}
              first={i === 0}
              icon={GOOD_ICONS[i] ?? 'checkCircle'}
              tint={theme.successSoft}
              ink={theme.success}
              title={item.title}
              subtitle={item.detail}
            />
          ))}
        </TintCard>
      </Section>

      <Section title={r.quietTitle}>
        <Card style={{ gap: 2 }}>
          <AppText variant="display">{r.quietHours}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {r.quietNote}
          </AppText>
        </Card>
      </Section>

      {/* The one rule foreigners don't expect, and it can cost them money: before the list. */}
      <Card style={[styles.warning, { backgroundColor: theme.warningSoft }]}>
        <Icon name="warning" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText color={theme.warning} style={{ fontFamily: Fonts.bodyMedium }}>
            {r.toiletTitle}
          </AppText>
          <AppText variant="callout" color={theme.text}>
            {r.toiletText}
          </AppText>
        </View>
      </Card>

      <Section title={r.forbiddenTitle}>
        <TintCard>
          {r.forbidden.map((rule, i) => (
            <TintRow
              key={rule.title}
              first={i === 0}
              icon="close"
              tint={theme.fill}
              ink={theme.textSecondary}
              title={rule.title}
              subtitle={rule.detail}
            />
          ))}
        </TintCard>
      </Section>

      <Section title={r.remindersTitle}>
        <TintCard>
          {r.reminders.map((reminder, i) => (
            <TintRow key={reminder} first={i === 0} icon="checkCircle" tint={theme.infoSoft} ink={theme.info} title={reminder} />
          ))}
        </TintCard>
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
