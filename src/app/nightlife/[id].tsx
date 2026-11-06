import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { HoursCard } from '@/components/hours-card';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { PlacePhoto } from '@/components/place-photo';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFromHome, useTimes } from '@/lib/places';
import { getNightPlace, nightMapsUrl } from '@/lib/nightlife';

export default function NightPlaceScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useTimes(getNightPlace(id));
  const fromHome = useFromHome(p);

  if (!p) return <Redirect href="/nightlife" />;


  return (
    <Screen back title={p.name} subtitle={`${p.vibe[lang]} · ${p.neighborhood}`}>
      {p.closed && (
        <Card style={styles.row}>
          <Icon name="close" size={20} color={theme.textSecondary} />
          <AppText style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>{p.closed[lang]}</AppText>
        </Card>
      )}

      <PlacePhoto
        placeId={p.placeId}
        source={p.photo}
        width={1000}
        aspectRatio={4 / 3}
        radius={Radius.lg}
        credit="below"
      />

      <AppText style={{ lineHeight: 23 }}>{p.description[lang]}</AppText>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow icon="clock" title={t.nightlife.when} subtitle={p.when[lang]} />
          {fromHome && <ListRow icon="walk" title={t.restaurants.fromHome} subtitle={fromHome} />}
          <ListRow icon="address" title={t.apartment.address} subtitle={p.address} />
          {p.website && (
            <ListRow icon="website" title={t.nightlife.website} onPress={() => Linking.openURL(p.website!)} />
          )}
        </ListGroup>
      </Card>

      <Card style={styles.row}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{p.tip[lang]}</AppText>
          {!p.closed && (
            <AppText variant="callout" color={theme.textSecondary}>
              {t.nightlife.checkParty}
            </AppText>
          )}
        </View>
      </Card>

      {p.kind === 'club' && (
        <Card style={styles.row}>
          <Icon name="rent" size={20} color={theme.textSecondary} />
          <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
            {t.nightlife.tickets}
          </AppText>
        </Card>
      )}

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(nightMapsUrl(p))}
      />

      <HoursCard hours={p.hours} />

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.nightlife.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
