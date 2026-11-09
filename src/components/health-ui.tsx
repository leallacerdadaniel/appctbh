import { router, type Href } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { TintCard, TintRow } from '@/components/home-v3';
import { ListGroup, ListRow } from '@/components/list';
import { AppText, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** Brazil's public emergency numbers, free from any phone. */
const NUMBERS = [
  { id: 'samu', number: '192' },
  { id: 'police', number: '190' },
  { id: 'fire', number: '193' },
] as const;

/**
 * 192, 190, 193 in a white card, each row calls (the number large in red on the right). Shared by the SOS page
 * and the health page so the numbers and their wording live in one place.
 */
export function EmergencyNumbers() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Card style={styles.listCard}>
      <ListGroup inset>
        {NUMBERS.map((n) => (
          <ListRow
            key={n.id}
            icon="phone"
            title={t.emergency.services[n.id]}
            subtitle={t.emergency.hints[n.id]}
            accessibilityLabel={`${t.emergency.services[n.id]}, ${n.number}`}
            onPress={() => Linking.openURL(`tel:${n.number}`)}
            accessory={
              <AppText variant="display" color={theme.brand}>
                {n.number}
              </AppText>
            }
          />
        ))}
      </ListGroup>
    </Card>
  );
}

/** Entry to the health page for Explorer › Pratique: a tinted-circle row, like the Portuguese and stolen-phone ones. */
export function HealthEntry() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <TintCard>
      <TintRow
        first
        icon="emergency"
        tint={theme.successSoft}
        ink={theme.success}
        title={t.health.entry}
        subtitle={t.health.entryHint}
        onPress={() => router.push('/health' as Href)}
      />
    </TintCard>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
