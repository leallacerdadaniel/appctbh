import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { MustGoBadge } from '@/components/must-go-badge';
import { PlacePhoto } from '@/components/place-photo';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { festivalMapsUrl, getFestival } from '@/lib/festivals';

export default function FestivalScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = getFestival(id);

  if (!e) return <Redirect href="/travel" />;

  return (
    <Screen back title={e.name} subtitle={e.city}>
      {e.mustGo && <MustGoBadge />}

      <PlacePhoto
        placeId={e.placeId}
        source={e.photo}
        photoIndex={e.photoIndex}
        width={1000}
        aspectRatio={4 / 3}
        radius={Radius.lg}
        credit="below"
      />

      <AppText style={{ lineHeight: 23 }}>{e.description[lang]}</AppText>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow icon="calendar" title={t.explore.when} subtitle={e.when[lang]} />
          <ListRow icon="address" title={t.explore.place} subtitle={e.place[lang]} />
          {e.cost && <ListRow icon="rent" title={t.explore.entry} subtitle={e.cost[lang]} />}
          {e.website && (
            <ListRow icon="website" title={t.explore.website} onPress={() => Linking.openURL(e.website!)} />
          )}
        </ListGroup>
      </Card>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{e.tip[lang]}</AppText>
        </View>
      </Card>

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(festivalMapsUrl(e))}
      />

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.explore.eventsDisclaimer}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
