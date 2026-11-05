import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { HoursCard } from '@/components/hours-card';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { MustGoBadge } from '@/components/must-go-badge';
import { PlacePhoto } from '@/components/place-photo';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { attractionMapsUrl, getAttraction } from '@/lib/attractions';
import { useFromHome, useTimes } from '@/lib/places';

export default function AttractionScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useTimes(getAttraction(id));
  const fromHome = useFromHome(a);

  if (!a) return <Redirect href="/travel" />;


  return (
    <Screen back title={a.name} subtitle={`${a.neighborhood} · ${t.explore.groups[a.group]}`}>
      {a.mustGo && <MustGoBadge />}

      <PlacePhoto
        placeId={a.placeId}
        source={a.photo}
        photoIndex={a.photoIndex}
        width={1000}
        aspectRatio={4 / 3}
        radius={Radius.lg}
        credit="below"
      />

      <AppText style={{ lineHeight: 23 }}>{a.description[lang]}</AppText>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {fromHome && <ListRow icon="walk" title={t.explore.fromHome} subtitle={fromHome} />}
          <ListRow icon="clock" title={t.explore.duration} subtitle={a.duration[lang]} />
          <ListRow icon="rent" title={t.explore.entry} subtitle={t.explore.price[a.price]} />
          <ListRow icon="address" title={t.apartment.address} subtitle={a.address} />
          {a.website && (
            <ListRow icon="website" title={t.explore.website} onPress={() => Linking.openURL(a.website!)} />
          )}
        </ListGroup>
      </Card>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{a.tip[lang]}</AppText>
        </View>
      </Card>

      <HoursCard hours={a.hours} />

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(attractionMapsUrl(a))}
      />

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.restaurants.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
