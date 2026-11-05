import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlacePhoto } from '@/components/place-photo';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, Chip, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { useTimes } from '@/lib/places';
import { SPORT_GROUPS, sportPlaces, type SportGroup, type SportPlace } from '@/lib/sports';

/** "Faire du sport": running spots, gym chains and places for each sport, filtered by chips. */
export default function SportsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [group, setGroup] = useState<SportGroup | null>(null);

  const shown = group ? [group] : SPORT_GROUPS;

  return (
    <Screen back title={t.sports.title} subtitle={t.sports.subtitle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}>
        <Chip label={t.sports.all} selected={group === null} onPress={() => setGroup(null)} />
        {SPORT_GROUPS.map((g) => (
          <Chip
            key={g}
            label={t.sports.groups[g]}
            selected={group === g}
            onPress={() => setGroup(group === g ? null : g)}
          />
        ))}
      </ScrollView>

      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.sports.trial}
        </AppText>
      </Card>

      {shown.map((g) => (
        <Section key={g} title={t.sports.groups[g]} subtitle={t.sports.groupHints[g]}>
          <View style={{ gap: 12 }}>
            {sportPlaces
              .filter((p) => p.groups.includes(g))
              .map((p) => (
                <SportRow key={p.id} place={p} />
              ))}
          </View>
        </Section>
      ))}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.sports.source}
      </AppText>
    </Screen>
  );
}

/** Same row as the restaurants: square photo, name, kind, area • distance. */
function SportRow({ place: raw }: { place: SportPlace }) {
  const p = useTimes(raw);
  const theme = useTheme();
  const { t, lang } = useI18n();
  const far = p.walkMin != null && p.walkMin > WALK_LIMIT_MIN;
  const distance =
    p.walkMin == null ? null : far && p.driveMin != null ? t.restaurants.drive(p.driveMin) : t.restaurants.walk(p.walkMin);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.kind[lang]}, ${p.neighborhood}`}
      onPress={() => router.push({ pathname: '/sports/[id]', params: { id: p.id } })}
      style={[styles.row, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.thumb}>
        <PlacePhoto placeId={p.placeId} source={p.photo} width={300} aspectRatio={1} radius={Radius.md} />
      </View>
      <View style={styles.text}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{p.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {p.kind[lang]}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {p.neighborhood}
          {distance ? ` • ${distance}` : ''}
        </AppText>
      </View>
      <Icon name="chevronRight" size={15} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: Radius.lg },
  thumb: { width: 92 },
  text: { flex: 1, gap: 3 },
});
