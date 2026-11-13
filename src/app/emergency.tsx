import { router, type Href } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { EmergencyNumbers } from '@/components/health-ui';
import { ListGroup, ListRow } from '@/components/list';
import { PhoneStolenEntry } from '@/components/phone-stolen-ui';
import { Screen, Section } from '@/components/screen';
import { Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { contacts } from '@/lib/mock-data';
import { trackAction } from '@/lib/usage';

/**
 * "Urgences": the stolen-phone guide first (2026-11-08), then numbers to call, health (the health page,
 * 2026-11-09, and the private hospitals near home) and Chez Toi for a problem in the apartment.
 */
export default function EmergencyScreen() {
  const { t } = useI18n();

  return (
    <Screen back title={t.emergency.title} subtitle={t.emergency.subtitle}>
      <PhoneStolenEntry />

      <Section title={t.emergency.call}>
        <EmergencyNumbers />
      </Section>

      <Section title={t.emergency.health}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="emergency"
              title={t.health.entry}
              subtitle={t.health.entryHint}
              onPress={() => router.push('/health' as Href)}
            />
            <ListRow
              icon="hospital"
              title={t.emergency.hospitals}
              subtitle={t.emergency.hospitalsHint}
              onPress={() => router.push({ pathname: '/nearby', params: { category: 'hospital' } })}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.emergency.apartment}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="whatsapp"
              title={t.emergency.writeUs}
              subtitle="WhatsApp"
              onPress={() => {
                trackAction('open_whatsapp', 'emergency');
                Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
              }}
            />
          </ListGroup>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
