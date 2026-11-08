import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { ListGroup, ListRow } from '@/components/list';
import { FieldLabel, requestHref } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatTime } from '@/lib/format';
import { gourmetSpace, serviceCatalog, stay } from '@/store/seed';
import type { ServiceCategory } from '@/store/types';

const CATEGORY_ORDER: ServiceCategory[] = ['cleaning', 'laundry', 'chef', 'transfer'];

/** Everything the student can ask the team: paid extras first, then the free requests. */
export default function NewRequestScreen() {
  const { t, lang } = useI18n();
  const r = t.requests;

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: serviceCatalog.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <Screen back title={r.newTitle} subtitle={r.newSubtitle}>
      <Section title={r.extras} subtitle={r.extrasHint}>
        {groups.map((g) => (
          <View key={g.category} style={styles.group}>
            <FieldLabel>{r.categories[g.category]}</FieldLabel>
            <HubGrid>
              {g.items.map((svc) => (
                <HubTile
                  key={svc.id}
                  emoji={svc.emoji}
                  title={svc.name[lang]}
                  status={r.priceUnit(formatBrl(svc.priceBrl, lang), svc.unit[lang])}
                  onPress={() => router.push(requestHref(`/requests/service/${svc.id}`))}
                />
              ))}
            </HubGrid>
          </View>
        ))}
      </Section>

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
              title={r.lateCheckoutTitle}
              subtitle={r.lateCheckoutHint(formatTime(stay.checkOutTime, lang))}
              onPress={() => router.push(requestHref('/requests/stay-change?kind=late_checkout'))}
            />
            <ListRow
              icon="key"
              title={r.earlyCheckinTitle}
              subtitle={r.earlyCheckinHint(formatTime(stay.checkInTime, lang))}
              onPress={() => router.push(requestHref('/requests/stay-change?kind=early_checkin'))}
            />
            {gourmetSpace && (
              <ListRow
                icon="grill"
                title={gourmetSpace.name[lang]}
                subtitle={r.gourmetHint(gourmetSpace.capacity)}
                onPress={() => router.push(requestHref('/requests/gourmet'))}
              />
            )}
          </ListGroup>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  listCard: { paddingVertical: 0 },
});
