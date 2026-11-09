import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Section } from '@/components/screen';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackAction } from '@/lib/usage';

type AroundMeId = 'restaurant' | 'bar' | 'cafe' | 'pharmacy' | 'atm' | 'supermarket';

/** What Google Maps searches for (in Portuguese: the places are in Brazil); "melhores" ranks by rating. */
const SEARCHES: { id: AroundMeId; icon: IconName; query: string }[] = [
  { id: 'restaurant', icon: 'restaurant', query: 'melhores restaurantes' },
  { id: 'bar', icon: 'bar', query: 'melhores bares' },
  { id: 'cafe', icon: 'cafe', query: 'melhores cafés' },
  { id: 'pharmacy', icon: 'pharmacy', query: 'farmácia' },
  { id: 'atm', icon: 'bank', query: 'caixa eletrônico 24 horas' },
  { id: 'supermarket', icon: 'supermarket', query: 'supermercado' },
];

/** Google Maps search around wherever the phone is (Maps URLs: no key, free); opens the Maps app when installed. */
export function aroundMeUrl(query: string) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`;
}

/**
 * "Autour de moi" (owner, 2026-11-09): the best places around the student wherever they are, in BH or on a
 * trip (Rio, Lençóis), at no cost. The app never reads the location: Google Maps uses its own.
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
              onPress={() => {
                trackAction('around_me', s.id);
                Linking.openURL(aroundMeUrl(s.query));
              }}
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
