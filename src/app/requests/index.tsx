import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { isOpen, isProblem, useRequests, type RequestsData, type TeamRequest } from '@/lib/requests';

type Segment = 'problems' | 'orders';

/**
 * "Mes demandes" in two (owner, 2026-11-27): "Problèmes" (something broken: the repair the team sends someone for)
 * and "Demandes" (extras, late check-out, early check-in, gourmet space). Open first, then the history.
 */
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
  const params = useLocalSearchParams<{ tab?: string }>();
  // Opens on the problems when one is open (or when asked for), otherwise on the requests.
  const [segment, setSegment] = useState<Segment>(() =>
    params.tab === 'problems' || params.tab === 'orders'
      ? params.tab
      : data.requests.some((x) => isProblem(x) && isOpen(x))
        ? 'problems'
        : 'orders',
  );

  // The list comes newest first.
  const mine = data.requests.filter((x) => (segment === 'problems' ? isProblem(x) : !isProblem(x)));
  const open = mine.filter(isOpen);
  const past = mine.filter((x) => !isOpen(x));
  const openIn = (s: Segment) => data.requests.filter((x) => isOpen(x) && (s === 'problems' ? isProblem(x) : !isProblem(x))).length;
  const label = (s: Segment) => (openIn(s) ? `${r.segments[s]} (${openIn(s)})` : r.segments[s]);

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
      <SegmentedControl<Segment>
        options={[
          { value: 'problems', label: label('problems') },
          { value: 'orders', label: label('orders') },
        ]}
        value={segment}
        onChange={setSegment}
      />

      <Button
        label={segment === 'problems' ? r.reportProblem : r.newRequest}
        icon={<Icon name="plus" size={17} color={theme.onBrand} />}
        onPress={() => router.push(requestHref(segment === 'problems' ? '/requests/maintenance' : '/requests/new'))}
      />

      {mine.length === 0 && (
        <Card>
          <AppText color={theme.textSecondary}>{segment === 'problems' ? r.problemsEmpty : r.ordersEmpty}</AppText>
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
