import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import { dishes, type Dish, type DishRegion, type TryAt } from '@/lib/dishes';
import { displayName, getRestaurant } from '@/lib/restaurants';
import { getDestination } from '@/lib/travel';

/** "Plats à goûter": traditional food of Minas Gerais and Brazil, with where to try it in BH. */
export default function DishesScreen() {
  const { t } = useI18n();
  const [region, setRegion] = useState<DishRegion>('mg');

  return (
    <Screen back title={t.dishes.title} subtitle={t.dishes.subtitle}>
      <SegmentedControl
        options={[
          { value: 'mg', label: t.dishes.regions.mg },
          { value: 'br', label: t.dishes.regions.br },
        ]}
        value={region}
        onChange={setRegion}
      />
      <View style={{ gap: Spacing.lg }}>
        {dishes
          .filter((d) => d.region === region)
          .map((d) => (
            <DishCard key={d.id} dish={d} />
          ))}
      </View>
      <AppText variant="caption" color={useTheme().textSecondary} style={{ textAlign: 'center' }}>
        {t.dishes.photosCredit}
      </AppText>
    </Screen>
  );
}

function DishCard({ dish: d }: { dish: Dish }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const places = (d.tryAt ?? []).map(resolve).filter((p): p is Resolved => !!p);

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={[styles.photo, { backgroundColor: theme.fill }]}>
        <Image source={{ uri: d.photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <AppText
          color={theme.onBrand}
          style={[styles.credit, { backgroundColor: theme.scrim }]}
          onPress={() => Linking.openURL(d.photo.source)}>
          © {d.photo.author} · {d.photo.license}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="title">{d.name}</AppText>
        <AppText color={theme.textSecondary}>{d.description[lang]}</AppText>
        <Card style={[styles.where, { backgroundColor: theme.fill }]}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.dishes.whereToTry}
          </AppText>
          <AppText variant="callout">{d.where[lang]}</AppText>
          {places.length > 0 && (
            <View style={styles.links}>
              {places.map((p) => (
                <PressableScale
                  key={p.key}
                  accessibilityRole="link"
                  onPress={p.open}
                  style={[styles.link, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                  <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
                    {p.label}
                  </AppText>
                  <Icon name="chevronRight" size={13} color={theme.textSecondary} />
                </PressableScale>
              ))}
            </View>
          )}
        </Card>
      </View>
    </View>
  );
}

type Resolved = { key: string; label: string; open: () => void };

/** A place mentioned for a dish → its page in the app (only places that exist there). */
function resolve(at: TryAt): Resolved | null {
  if (at.kind === 'restaurant') {
    const r = getRestaurant(at.id);
    return r
      ? { key: at.id, label: displayName(r), open: () => router.push({ pathname: '/restaurants/[id]', params: { id: at.id } }) }
      : null;
  }
  if (at.kind === 'attraction') {
    const a = getAttraction(at.id);
    return a
      ? { key: at.id, label: a.name, open: () => router.push({ pathname: '/attraction/[id]', params: { id: at.id } }) }
      : null;
  }
  const d = getDestination(at.id);
  return d
    ? { key: at.id, label: d.name, open: () => router.push({ pathname: '/travel/[id]', params: { id: at.id } }) }
    : null;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 16 / 10 },
  credit: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    maxWidth: '80%',
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  body: { padding: Spacing.md, gap: Spacing.sm },
  where: { gap: 4, padding: 12, boxShadow: 'none' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
