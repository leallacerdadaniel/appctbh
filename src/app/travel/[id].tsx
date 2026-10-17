import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { MustGoBadge } from '@/components/must-go-badge';
import { PlacePhoto } from '@/components/place-photo';
import { PriceLevel } from '@/components/price-level';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getDestination, placeLabel, transportIcon } from '@/lib/travel';

export default function DestinationScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = getDestination(id);

  if (!d) return <Redirect href="/travel" />;

  return (
    <Screen back title={d.name} subtitle={`${placeLabel(d, lang)} · ${t.travel.trips[d.trip]}`}>
      {d.mustGo && <MustGoBadge />}

      <PlacePhoto
        placeId={d.placeId}
        photoIndex={d.photoIndex}
        width={1000}
        aspectRatio={4 / 3}
        radius={Radius.lg}
        credit="below"
      />

      <AppText style={{ lineHeight: 23 }}>{d.description[lang]}</AppText>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <Fact icon={transportIcon(d)} label={t.travel.fromBh} value={d.fromBh[lang]} />
          <Fact icon="travel" label={t.travel.getThere} value={d.getThere[lang]} />
          <Fact icon="clock" label={t.travel.stay} value={d.stay[lang]} />
          <Fact icon="season" label={t.travel.season} value={d.season[lang]} />
          {d.documents && <Fact icon="document" label={t.explore.documents} value={d.documents[lang]} />}
          <ListRow
            icon="rent"
            title={t.travel.cost}
            subtitle={t.travel.costLevels[d.cost]}
            accessory={<PriceLevel level={d.cost} />}
          />
        </ListGroup>
      </Card>

      <Section title={t.travel.highlights}>
        <Card style={{ gap: Spacing.sm }}>
          {d.highlights.map((h) => (
            <View key={h.en} style={styles.highlight}>
              <View style={[styles.dot, { backgroundColor: theme.textTertiary }]} />
              <AppText style={{ flex: 1 }}>{h[lang]}</AppText>
            </View>
          ))}
        </Card>
      </Section>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{d.tip[lang]}</AppText>
        </View>
      </Card>

      <Button
        label={t.travel.openMaps}
        icon={<Icon name="map" size={17} color={theme.onBrand} />}
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.mapsQuery)}`,
          )
        }
      />

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.travel.disclaimer}
      </AppText>
    </Screen>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <ListRow icon={icon} title={label} subtitle={value} />;
}

const styles = StyleSheet.create({
  highlight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
