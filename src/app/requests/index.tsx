import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { requestHref, requestIcon, requestTitle, requestWhen, StatusPill } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useStore } from '@/store';
import { isOpen, sortedRequests } from '@/store/selectors';
import type { AnyRequest } from '@/store/types';

/** "Mes demandes": open requests first, then the history. */
export default function RequestsScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const r = t.requests;
  const all = useStore(sortedRequests);
  const open = all.filter(isOpen);
  const past = all.filter((x) => !isOpen(x));

  const row = (req: AnyRequest) => (
    <ListRow
      key={req.id}
      icon={requestIcon(req)}
      title={requestTitle(req, lang, t)}
      subtitle={requestWhen(req, lang, t)}
      accessibilityLabel={`${requestTitle(req, lang, t)}, ${r.status[req.status]}`}
      onPress={() => router.push(requestHref(`/requests/${req.id}`))}
      accessory={<StatusPill status={req.status} />}
    />
  );

  return (
    <Screen back title={r.title} subtitle={r.subtitle}>
      <Button
        label={r.newRequest}
        icon={<Icon name="plus" size={17} color={theme.onBrand} />}
        onPress={() => router.push(requestHref('/requests/new'))}
      />

      {all.length === 0 && (
        <Card>
          <AppText color={theme.textSecondary}>{r.empty}</AppText>
        </Card>
      )}

      {open.length > 0 && (
        <Section title={r.open} subtitle={r.openHint}>
          <Card style={styles.listCard}>
            <ListGroup inset>{open.map(row)}</ListGroup>
          </Card>
        </Section>
      )}

      {past.length > 0 && (
        <Section title={r.history}>
          <Card style={styles.listCard}>
            <ListGroup inset>{past.map(row)}</ListGroup>
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
