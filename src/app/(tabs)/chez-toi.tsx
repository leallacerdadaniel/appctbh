import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  rentMonthLabel,
  requestHref,
  requestIcon,
  requestTitle,
  requestWhen,
  StatusPill,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatCents, formatDate, formatMoney, isFutureMonth } from '@/lib/format';
import { useHandovers } from '@/lib/handovers';
import { useHome, useHomeState } from '@/lib/home';
import { contacts } from '@/lib/mock-data';
import { isOpen, upcomingCharges, useRequests } from '@/lib/requests';
import { trackAction } from '@/lib/usage';

/** Open requests shown on the tab; the rest is one tap away in "Mes demandes". */
const OPEN_MAX = 3;

/**
 * "Chez Toi": what the student asks, pays and signs with Chez Toi (structure by task, owner 2026-11-08).
 * Each row carries its live status; the detail stays on the existing sub-pages.
 */
export default function ChezToiScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.apartment.payments;
  const { contract, payments, deposit } = useHome();
  const { refresh } = useHomeState();
  const { state: requestsState, reload: reloadRequests } = useRequests();
  const handovers = useHandovers();

  const data = requestsState.status === 'ready' ? requestsState.data : null;
  const open = data ? data.requests.filter(isOpen) : [];
  const charges = data ? upcomingCharges(data.requests) : [];
  const pendingRent = payments.filter((m) => !m.paid && !isFutureMonth(m.month)).length;
  const paidCount = payments.filter((m) => m.paid).length;
  const handoverStatus = (date: string | null | undefined) =>
    date ? t.apartment.handover.on(formatDate(date, lang)) : t.apartment.handover.notYet;

  return (
    <Screen
      title={t.tabs.chezToi}
      subtitle={t.chezToi.subtitle}
      onRefresh={() => Promise.all([refresh(), reloadRequests()])}>
      <Section title={t.chezToi.ask} subtitle={t.chezToi.askHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="plus"
              title={t.requests.homeNew}
              subtitle={t.requests.homeNewHint}
              onPress={() => router.push(requestHref('/requests/new'))}
            />
            <ListRow
              icon="wrench"
              title={t.requests.maintenanceTitle}
              subtitle={t.requests.maintenanceHint}
              onPress={() => router.push(requestHref('/requests/maintenance'))}
            />
          </ListGroup>
        </Card>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {open.slice(0, OPEN_MAX).map((req) => (
              <ListRow
                key={req.id}
                icon={requestIcon(req, data?.catalog)}
                title={requestTitle(req, t, lang)}
                subtitle={requestWhen(req, t, lang)}
                accessibilityLabel={`${requestTitle(req, t, lang)}, ${t.requests.status[req.status]}`}
                onPress={() => router.push(requestHref(`/requests/${req.id}`))}
                accessory={<StatusPill status={req.status} />}
              />
            ))}
            <ListRow
              icon="receipt"
              title={open.length ? t.chezToi.allRequests : t.requests.title}
              subtitle={
                requestsState.status === 'error'
                  ? t.requests.unavailable
                  : open.length > OPEN_MAX
                    ? t.requests.openCount(open.length)
                    : data && !open.length
                      ? t.chezToi.noOpen
                      : undefined
              }
              onPress={() => router.push(requestHref('/requests'))}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.chezToi.pay} subtitle={t.chezToi.payHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="rent"
              title={p.rent}
              subtitle={
                pendingRent
                  ? p.pending(pendingRent)
                  : payments.length
                    ? p.paidOf(paidCount, payments.length)
                    : p.noRent
              }
              subtitleColor={pendingRent ? theme.warning : undefined}
              onPress={() => router.push('/apartment/payments')}
            />
            {/* Extras go on the next rents (Chez Toi advances the cost): one row per rent month. */}
            {charges.map((c) => (
              <ListRow
                key={`${c.month}-${c.currency}`}
                icon="receipt"
                title={capitalize(t.chezToi.extrasOn(rentMonthLabel(c.month, lang)))}
                subtitle={c.requests.map((r) => requestTitle(r, t, lang)).join(', ')}
                value={formatCents(c.cents, lang, c.currency)}
                onPress={() => router.push('/apartment/payments')}
              />
            ))}
            <ListRow
              icon="wallet"
              title={p.deposit}
              subtitle={
                !deposit
                  ? p.noDeposit
                  : deposit.status === 'returned'
                    ? deposit.returnedDate
                      ? p.returnedOn(formatDate(deposit.returnedDate, lang))
                      : p.returnedShort
                    : deposit.status === 'pending'
                      ? p.depositPending
                      : p.withUs
              }
              subtitleColor={deposit?.status === 'pending' ? theme.warning : undefined}
              value={deposit ? formatMoney(deposit.amount, deposit.currency, lang) : undefined}
              onPress={() => router.push('/apartment/payments')}
            />
          </ListGroup>
        </Card>
      </Section>

      {/* Other documents (inspection reports, receipts) will join this section later. */}
      <Section title={t.chezToi.contract} subtitle={t.chezToi.contractHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="document"
              title={t.apartment.contract}
              subtitle={t.apartment.contractUntil(contract.semester, formatDate(contract.moveOut, lang))}
              onPress={() => router.push('/apartment/contract')}
            />
            <ListRow
              icon="key"
              title={t.apartment.handover.checkin.title}
              subtitle={handoverStatus(handovers?.checkin.date)}
              onPress={() => router.push('/apartment/checkin')}
            />
            <ListRow
              icon="luggage"
              title={t.apartment.handover.checkout.title}
              subtitle={handoverStatus(handovers?.checkout.date)}
              onPress={() => router.push('/apartment/checkout')}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.chezToi.help} subtitle={t.chezToi.helpHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="whatsapp"
              title={t.home.writeUs}
              subtitle="WhatsApp"
              onPress={() => {
                trackAction('open_whatsapp', 'chez-toi');
                Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
              }}
            />
            {/*
              TODO(assistant): an "Assistant" row goes here once the in-app assistant exists.
              No placeholder row until then (no dead buttons).
            */}
          </ListGroup>
        </Card>
      </Section>
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
