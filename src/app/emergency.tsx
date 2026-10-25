import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { contacts } from '@/lib/mock-data';

/** Brazil's public emergency numbers, free from any phone. */
const NUMBERS = [
  { id: 'samu', number: '192' },
  { id: 'police', number: '190' },
  { id: 'fire', number: '193' },
] as const;

/** "Urgences": numbers to call, the private hospitals and Chez Toi for a problem in the apartment. */
export default function EmergencyScreen() {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Screen back title={t.emergency.title} subtitle={t.emergency.subtitle}>
      <Section title={t.emergency.call}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {NUMBERS.map((n) => (
              <ListRow
                key={n.id}
                icon="phone"
                title={t.emergency.services[n.id]}
                subtitle={t.emergency.hints[n.id]}
                value={n.number}
                accessibilityLabel={`${t.emergency.services[n.id]}, ${n.number}`}
                onPress={() => Linking.openURL(`tel:${n.number}`)}
                accessory={<Icon name="phone" size={16} color={theme.textTertiary} />}
              />
            ))}
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.emergency.health}>
        <Card style={styles.listCard}>
          <ListGroup inset>
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
              onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
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
