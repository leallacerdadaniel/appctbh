import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { HoursCard } from '@/components/hours-card';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { beautyMapsUrl, getBeautyPlace, type BeautyPlace, type BeautyUnit } from '@/lib/beauty';
import { useFromHome, useUnitTimes } from '@/lib/places';

export default function BeautyPlaceScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useUnitTimes(getBeautyPlace(id));
  // Chains: the student picks a unit; the closest one is shown first.
  const [unitId, setUnitId] = useState<string>();

  if (!p) return <Redirect href="/beauty" />;

  const unit = p.units.find((u) => u.placeId === unitId) ?? p.units[0];
  const chain = p.units.length > 1;

  return (
    <Screen back title={p.name} subtitle={`${p.kind[lang]} · ${p.neighborhoods.join(', ')}`}>
      <AppText style={{ lineHeight: 23 }}>{p.description[lang]}</AppText>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{p.tip[lang]}</AppText>
        </View>
      </Card>

      {chain ? (
        <Section title={t.beauty.addresses(p.units.length)}>
          <SegmentedControl
            options={p.units.map((u) => ({ value: u.placeId, label: u.neighborhood }))}
            value={unit.placeId}
            onChange={setUnitId}
          />
          <UnitDetails place={p} unit={unit} />
        </Section>
      ) : (
        <UnitDetails place={p} unit={unit} />
      )}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.beauty.source}
      </AppText>
    </Screen>
  );
}

/** Distance, address, phone, website, hours and directions of one location. */
function UnitDetails({ place: p, unit: u }: { place: BeautyPlace; unit: BeautyUnit }) {
  const theme = useTheme();
  const { t } = useI18n();
  const fromHome = useFromHome(u);


  return (
    <>
      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {fromHome && <ListRow icon="walk" title={t.restaurants.fromHome} subtitle={fromHome} />}
          <ListRow icon="address" title={t.apartment.address} subtitle={u.address} />
          {u.phone && (
            <ListRow
              icon="phone"
              title={t.beauty.call}
              subtitle={u.phone}
              onPress={() => Linking.openURL(`tel:${u.phone!.replace(/\s/g, '')}`)}
            />
          )}
          {u.website && (
            <ListRow icon="website" title={t.beauty.website} onPress={() => Linking.openURL(u.website!)} />
          )}
        </ListGroup>
      </Card>

      <HoursCard hours={u.hours} />

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(beautyMapsUrl(p, u))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
