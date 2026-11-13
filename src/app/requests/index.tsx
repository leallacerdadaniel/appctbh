import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import {
  requestHref,
  requestIcon,
  requestTitle,
  requestWhen,
  RequestsGate,
  StatusPill,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { isOpen, useRequests, type RequestsData, type TeamRequest } from '@/lib/requests';

/** "Mes demandes": open requests first, then the history. Pull down to refresh. */
export default function RequestsScreen() {
  const { t } = useI18n();
  const { reload } = useRequests();
  return (
    <Screen back title={t.requests.title} subtitle={t.requests.subtitle} onRefresh={reload}>
      <RequestsGate>{(data) => <Content data={data} />}</RequestsGate>
    </Screen>
  );
}

function Content({ data }: { data: RequestsData }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const r = t.requests;
  // The list comes newest first.
  const open = data.requests.filter(isOpen);
  const past = data.requests.filter((x) => !isOpen(x));

  const row = (req: TeamRequest) => (
    <ListRow
      key={req.id}
      icon={requestIcon(req, data.catalog)}
      title={requestTitle(req, t, lang)}
      subtitle={requestWhen(req, t, lang)}
      accessibilityLabel={`${requestTitle(req, t, lang)}, ${r.status[req.status]}`}
      onPress={() => router.push(requestHref(`/requests/${req.id}`))}
      accessory={<StatusPill status={req.status} />}
    />
  );

  return (
    <>
      <Button
        label={r.newRequest}
        icon={<Icon name="plus" size={17} color={theme.onBrand} />}
        onPress={() => router.push(requestHref('/requests/new'))}
      />

      {data.requests.length === 0 && (
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
    </>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
