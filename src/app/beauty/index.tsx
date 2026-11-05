import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, Chip, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { BEAUTY_GROUPS, beautyPlaces, type BeautyGroup, type BeautyPlace } from '@/lib/beauty';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { useUnitTimes } from '@/lib/places';

/** "Beauté et bien-être": hair, nails, brows, hair removal and spas, filtered by chips. */
export default function BeautyScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [group, setGroup] = useState<BeautyGroup | null>(null);

  const shown = group ? [group] : BEAUTY_GROUPS;

  return (
    <Screen back title={t.beauty.title} subtitle={t.beauty.subtitle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}>
        <Chip label={t.beauty.all} selected={group === null} onPress={() => setGroup(null)} />
        {BEAUTY_GROUPS.map((g) => (
          <Chip
            key={g}
            label={t.beauty.groups[g]}
            selected={group === g}
            onPress={() => setGroup(group === g ? null : g)}
          />
        ))}
      </ScrollView>

      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.beauty.booking}
        </AppText>
      </Card>

      {shown.map((g) => (
        <Section key={g} title={t.beauty.groups[g]} subtitle={t.beauty.groupHints[g]}>
          <View style={{ gap: 12 }}>
            {beautyPlaces
              .filter((p) => p.group === g)
              .map((p) => (
                <BeautyRow key={p.id} place={p} />
              ))}
          </View>
        </Section>
      ))}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.beauty.source}
      </AppText>
    </Screen>
  );
}

/** Name, kind, area • distance; no photo (owner's decision). */
function BeautyRow({ place: raw }: { place: BeautyPlace }) {
  const p = useUnitTimes(raw);
  const theme = useTheme();
  const { t, lang } = useI18n();
  const far = p.walkMin != null && p.walkMin > WALK_LIMIT_MIN;
  const distance =
    p.walkMin == null ? null : far && p.driveMin != null ? t.restaurants.drive(p.driveMin) : t.restaurants.walk(p.walkMin);

  const chain = p.units.length > 1;
  const areas = p.neighborhoods.join(', ');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.kind[lang]}, ${areas}`}
      onPress={() => router.push({ pathname: '/beauty/[id]', params: { id: p.id } })}
      style={[styles.row, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.text}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{p.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {p.kind[lang]}
        </AppText>
        {chain ? (
          <>
            {/* Chains: every location on the card, then how far the closest one is. */}
            <AppText variant="callout" color={theme.textSecondary}>
              {areas}
            </AppText>
            <AppText variant="callout" color={theme.textSecondary}>
              {t.beauty.addresses(p.units.length)}
              {distance ? ` • ${t.beauty.nearest(distance)}` : ''}
            </AppText>
          </>
        ) : (
          <AppText variant="callout" color={theme.textSecondary}>
            {areas}
            {distance ? ` • ${distance}` : ''}
          </AppText>
        )}
      </View>
      <Icon name="chevronRight" size={15} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.md, borderRadius: Radius.lg },
  text: { flex: 1, gap: 3 },
});
