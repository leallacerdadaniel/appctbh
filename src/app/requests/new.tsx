import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { ListGroup, ListRow } from '@/components/list';
import { FieldLabel, requestHref, RequestsGate } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { formatCents } from '@/lib/format';
import { localized, type RequestsData, type ServiceCategory } from '@/lib/requests';

const CATEGORY_ORDER: ServiceCategory[] = ['cleaning', 'laundry', 'chef', 'transfer', 'other'];

/** Everything the student can ask the team: paid extras first, then the free requests. */
export default function NewRequestScreen() {
  const { t } = useI18n();
  return (
    <Screen back title={t.requests.newTitle} subtitle={t.requests.newSubtitle}>
      <RequestsGate>{(data) => <Content data={data} />}</RequestsGate>
    </Screen>
  );
}

function Content({ data }: { data: RequestsData }) {
  const { t, lang } = useI18n();
  const r = t.requests;
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: data.catalog.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {groups.length > 0 && (
        <Section title={r.extras} subtitle={r.extrasHint}>
          {groups.map((g) => (
            <View key={g.category} style={styles.group}>
              <FieldLabel>{r.categories[g.category]}</FieldLabel>
              <HubGrid>
                {g.items.map((svc) => (
                  <HubTile
                    key={svc.id}
                    emoji={svc.emoji}
                    title={localized(svc.name, lang)}
                    status={r.priceUnit(formatCents(svc.priceCents, lang, svc.currency), localized(svc.unit, lang))}
                    onPress={() => router.push(requestHref(`/requests/service/${svc.id}`))}
                  />
                ))}
              </HubGrid>
            </View>
          ))}
        </Section>
      )}

      <Section title={r.other} subtitle={r.otherHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="wrench"
              title={r.maintenanceTitle}
              subtitle={r.maintenanceHint}
              onPress={() => router.push(requestHref('/requests/maintenance'))}
            />
            <ListRow
              icon="luggage"
              title={r.kinds.late_checkout}
              subtitle={r.lateCheckoutHint}
              onPress={() =>
                router.push(requestHref('/requests/stay-change?kind=late_checkout'))
              }
            />
            <ListRow
              icon="key"
              title={r.kinds.early_checkin}
              subtitle={r.earlyCheckinHint}
              onPress={() =>
                router.push(requestHref('/requests/stay-change?kind=early_checkin'))
              }
            />
            {data.gourmet && (
              <ListRow
                icon="grill"
                title={localized(data.gourmet.name, lang) || r.kinds.gourmet}
                subtitle={r.gourmetHint(data.gourmet.capacity)}
                onPress={() => router.push(requestHref('/requests/gourmet'))}
              />
            )}
          </ListGroup>
        </Card>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  listCard: { paddingVertical: 0 },
});
