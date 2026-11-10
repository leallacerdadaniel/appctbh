import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Section } from '@/components/screen';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackAction } from '@/lib/usage';

export type AroundMeId = 'restaurant' | 'bar' | 'cafe' | 'pharmacy' | 'atm' | 'supermarket';

/** What Google Maps searches for (in Portuguese: the places are in Brazil); "melhores" ranks by rating. */
const QUERIES: Record<AroundMeId, string> = {
  restaurant: 'melhores restaurantes',
  bar: 'melhores bares',
  cafe: 'melhores cafés',
  pharmacy: 'farmácia',
  atm: 'caixa eletrônico 24 horas',
  supermarket: 'supermercado',
};

/**
 * The circles of the "Autour de moi" section. One entry per need (UX review 2026-11-10): the pharmacy and the
 * groceries are not here any more, they are the "Pharmacie" and "Courses" shortcuts of Explorer › Pratique, which
 * ask "Chez moi / Où je suis" and call `openAroundMe` for the second answer.
 */
const SEARCHES: { id: 'restaurant' | 'bar' | 'cafe' | 'atm'; icon: IconName }[] = [
  { id: 'restaurant', icon: 'restaurant' },
  { id: 'bar', icon: 'bar' },
  { id: 'cafe', icon: 'cafe' },
  { id: 'atm', icon: 'bank' },
];

/** Google Maps search around wherever the phone is (Maps URLs: no key, free); opens the Maps app when installed. */
export function aroundMeUrl(query: string) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`;
}

/** Opens Google Maps on that need, around where the phone is. */
export function openAroundMe(id: AroundMeId) {
  trackAction('around_me', id);
  Linking.openURL(aroundMeUrl(QUERIES[id])).catch(() => {});
}

/**
 * "Autour de moi" (owner, 2026-11-09): the best places around the student wherever they are, in BH or on a
 * trip (Rio, Lençóis), at no cost. The app never reads the location: Google Maps uses its own.
 * In one place only: Explorer › Pour vous (UX review 2026-11-10).
 */
export function AroundMe() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Section title={t.aroundMe.title} subtitle={t.aroundMe.subtitle}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
        {SEARCHES.map((s) => {
          const label = t.aroundMe.items[s.id];
          return (
            <PressableScale
              key={s.id}
              accessibilityRole="link"
              accessibilityLabel={t.aroundMe.open(label)}
              onPress={() => openAroundMe(s.id)}
              style={styles.item}>
              <View style={[styles.circle, Shadow.card, { backgroundColor: theme.surface }]}>
                <Icon name={s.icon} size={22} color={theme.text} />
              </View>
              <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium, textAlign: 'center' }}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  row: { paddingHorizontal: Spacing.gutter, gap: Spacing.md },
  item: { width: 76, alignItems: 'center', gap: 6 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
