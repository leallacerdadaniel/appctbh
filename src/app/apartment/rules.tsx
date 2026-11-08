import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { houseRules } from '@/store/seed';
import type { HouseRule } from '@/store/types';

/** House rules (contract + building rules), grouped apartment / building. Written by the team. */
export default function RulesScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();

  const groups: { scope: HouseRule['scope']; title: string; subtitle: string }[] = [
    { scope: 'apartment', title: t.house.apartmentRules, subtitle: t.house.apartmentRulesHint },
    { scope: 'building', title: t.house.buildingRules, subtitle: t.house.buildingRulesHint },
  ];

  return (
    <Screen back title={t.house.rulesTitle} subtitle={t.house.rulesSubtitle}>
      <View style={styles.intro}>
        <Icon name="info" size={17} color={theme.textSecondary} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.house.rulesIntro}
        </AppText>
      </View>
      {groups.map((g) => {
        const rules = houseRules.filter((r) => r.scope === g.scope);
        if (rules.length === 0) return null;
        return (
          <Section key={g.scope} title={g.title} subtitle={g.subtitle}>
            <Card style={styles.card}>
              {rules.map((r, i) => (
                <View
                  key={r.id}
                  style={[
                    styles.rule,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
                  ]}>
                  <AppText style={{ fontFamily: Fonts.bodyMedium }}>{r.title[lang]}</AppText>
                  <AppText variant="callout" color={theme.textSecondary}>
                    {r.body[lang]}
                  </AppText>
                </View>
              ))}
            </Card>
          </Section>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  card: { paddingVertical: 0 },
  rule: { gap: Spacing.xs, paddingVertical: 14 },
});
