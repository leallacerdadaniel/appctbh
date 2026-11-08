import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatLongDate, upcomingCleanings } from '@/lib/cleaning';
import { formatBrl, formatDate, formatShortDate, formatTime } from '@/lib/format';
import { connectToWifi } from '@/lib/wifi';
import { useStore } from '@/store';
import {
  accumulating,
  balances,
  choreWeek,
  currentInvoice,
  isOpen,
  monthLabel,
  roommates,
  thisWeek,
} from '@/store/selectors';
import { apartment, houseRules, inspections, ME, stay } from '@/store/seed';
import type { InvoiceStatus } from '@/store/types';

/**
 * "Mon appart" hub: photo, address, Wi‑Fi and this month's bill (used daily), then tiles to the
 * sub-pages in two groups (my home / home life). Each tile shows a live status line.
 */
export default function ApartmentScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [showWifi, setShowWifi] = useState(false);
  const [joining, setJoining] = useState(false);

  const invoice = useStore((s) => currentInvoice(s));
  const extras = useStore((s) => accumulating(s).length);
  const openRequests = useStore((s) => s.requests.filter(isOpen).length);
  const missingDocs = useStore((s) => s.documents.filter((d) => d.status === 'missing').length);
  const myChores = useStore((s) =>
    choreWeek(s, thisWeek())
      .filter((c) => c.assignee === ME)
      .map((c) => c.chore.name[lang]),
  );
  const myBalance = useStore((s) => balances(s)[ME] ?? 0);

  async function copy(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    toast(message);
  }

  async function joinWifi() {
    setJoining(true);
    try {
      const result = await connectToWifi(apartment.wifiName, apartment.wifiPassword);
      toast(
        result.method === 'joined'
          ? t.house.wifiJoined(apartment.wifiName)
          : t.house.wifiCopied(apartment.wifiName),
      );
    } finally {
      setJoining(false);
    }
  }

  const go = (href: string) => router.push(href as Href);

  const fullAddress = `${apartment.address}, ${apartment.complement} — ${apartment.neighborhood}, ${apartment.city}`;
  const next = upcomingCleanings[0];
  const cleaningStatus = next
    ? t.apartment.nextCleaning(`${capitalize(formatLongDate(next.date, lang))} · ${formatTime(next.time, lang)}`)
    : t.apartment.cleaning.empty;
  const moveInInspection = inspections.find((i) => i.kind === 'move_in');
  const balanceStatus =
    myBalance > 0.009
      ? t.house.balanceOwed(formatBrl(myBalance, lang))
      : myBalance < -0.009
        ? t.house.balanceOwe(formatBrl(-myBalance, lang))
        : t.house.balanceSettled;

  return (
    <Screen title={apartment.nickname} subtitle={`${apartment.complement} · ${apartment.neighborhood}`}>
      <View style={[styles.photo, Shadow.card, { backgroundColor: theme.fill }]}>
        <Image
          source={{ uri: apartment.photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      </View>

      <Card style={styles.listCard}>
        <ListGroup inset>
          <ListRow
            icon="address"
            title={t.apartment.address}
            subtitle={apartment.address}
            accessory={
              // Two actions side by side (a button can't sit inside a pressable row).
              <View style={styles.inline}>
                <IconButton
                  icon="directions"
                  label={t.apartment.openMaps}
                  onPress={() =>
                    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(apartment.mapsQuery)}`)
                  }
                />
                <IconButton
                  icon="copy"
                  label={t.apartment.copyAddress}
                  onPress={() => copy(fullAddress, t.apartment.addressCopied)}
                />
              </View>
            }
          />
          <ListRow icon="wifi" title={t.apartment.network} value={apartment.wifiName} />
          <ListRow
            icon="key"
            title={t.apartment.wifiPassword}
            subtitle={showWifi ? apartment.wifiPassword : '••••••••••'}
            accessory={
              <View style={styles.inline}>
                <IconButton
                  icon={showWifi ? 'hide' : 'show'}
                  label={showWifi ? t.apartment.hide : t.apartment.show}
                  onPress={() => setShowWifi((v) => !v)}
                />
                <IconButton
                  icon="copy"
                  label={t.apartment.copyPassword}
                  onPress={() => copy(apartment.wifiPassword, t.apartment.passwordCopied)}
                />
              </View>
            }
          />
        </ListGroup>
        <View style={styles.wifiAction}>
          <Button
            label={t.house.connectWifi}
            loading={joining}
            onPress={joinWifi}
            icon={<Icon name="wifi" size={17} color={theme.onBrand} />}
          />
        </View>
      </Card>

      <Section title={t.bill.thisMonth} subtitle={t.bill.thisMonthHint}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={
            invoice
              ? `${t.bill.billOf(monthLabel(invoice.month, lang))}, ${formatBrl(invoice.totalBrl, lang)}, ${t.bill.status[invoice.status]}`
              : t.bill.nothingDue
          }
          onPress={() => go('/apartment/bill')}
          style={[styles.billCard, Shadow.card, { backgroundColor: theme.surface }]}>
          {invoice ? (
            <View style={{ gap: Spacing.sm }}>
              <View style={styles.billTop}>
                <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
                  {capitalize(t.bill.billOf(monthLabel(invoice.month, lang)))}
                </AppText>
                <StatusPill status={invoice.status} label={t.bill.status[invoice.status]} />
              </View>
              <AppText variant="display">{formatBrl(invoice.totalBrl, lang)}</AppText>
              <View style={styles.billBottom}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="callout">{t.bill.due(formatDate(invoice.dueDate, lang))}</AppText>
                  <AppText variant="caption" color={theme.textSecondary}>
                    {t.bill.extrasPending(extras)}
                  </AppText>
                </View>
                <Icon name="chevronRight" size={15} color={theme.textTertiary} />
              </View>
            </View>
          ) : (
            <View style={styles.billBottom}>
              <AppText style={{ flex: 1 }}>{t.bill.nothingDue}</AppText>
              <Icon name="chevronRight" size={15} color={theme.textTertiary} />
            </View>
          )}
        </PressableScale>
      </Section>

      <Section title={t.house.myHome} subtitle={t.house.myHomeHint}>
        <HubGrid>
          <HubTile
            emoji="🧾"
            title={t.bill.title}
            status={
              invoice
                ? t.bill.tileStatus(formatBrl(invoice.totalBrl, lang), formatShortDate(invoice.dueDate, lang))
                : t.bill.tilePaid
            }
            onPress={() => go('/apartment/bill')}
          />
          <HubTile
            emoji="🛠️"
            title={t.house.requests}
            status={t.house.requestsStatus(openRequests)}
            onPress={() => go('/requests')}
          />
          <HubTile
            emoji="🧹"
            title={t.apartment.cleaning.title}
            status={cleaningStatus}
            onPress={() => go('/apartment/cleaning')}
          />
          <HubTile
            emoji="📄"
            title={t.apartment.contract}
            status={t.apartment.contractUntil(stay.semester, formatDate(stay.moveOut, lang))}
            onPress={() => go('/apartment/contract')}
          />
          <HubTile
            emoji="📦"
            title={t.house.inventory}
            status={
              moveInInspection
                ? t.house.inventoryStatus(formatDate(moveInInspection.date, lang))
                : t.house.inventorySubtitle
            }
            onPress={() => go('/apartment/inventory')}
          />
          <HubTile
            emoji="🪪"
            title={t.house.documents}
            status={t.house.documentsStatus(missingDocs)}
            onPress={() => go('/apartment/documents')}
          />
        </HubGrid>
      </Section>

      <Section title={t.house.homeLife} subtitle={t.house.homeLifeHint}>
        <HubGrid>
          <HubTile
            emoji="👥"
            title={t.apartment.roommates}
            status={roommates()
              .map((r) => r.firstName)
              .join(', ')}
            onPress={() => go('/apartment/roommates')}
          />
          <HubTile
            emoji="🗓️"
            title={t.house.chores}
            status={myChores.length ? t.house.choresStatus(myChores.join(', ')) : t.house.choresNone}
            onPress={() => go('/house/chores')}
          />
          <HubTile
            emoji="💸"
            title={t.house.expenses}
            status={balanceStatus}
            onPress={() => go('/house/expenses')}
          />
          <HubTile
            emoji="📋"
            title={t.house.rules}
            status={t.house.rulesStatus(houseRules.length)}
            onPress={() => go('/apartment/rules')}
          />
          <HubTile
            emoji="📍"
            title={t.apartment.neighborhood}
            status={t.apartment.aroundHint}
            onPress={() => go('/nearby')}
          />
        </HubGrid>
      </Section>
    </Screen>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}>
      <Icon name={icon} size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

/** Invoice status: neutral pill, green when paid, error color (never brand red) when overdue. */
function StatusPill({ status, label }: { status: InvoiceStatus; label: string }) {
  const theme = useTheme();
  const fg = status === 'paid' ? theme.success : status === 'overdue' ? theme.error : theme.text;
  const bg = status === 'paid' ? theme.successSoft : status === 'overdue' ? theme.errorSoft : theme.fill;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {status === 'overdue' && <Icon name="warning" size={13} color={fg} />}
      <AppText variant="caption" color={fg} style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: Radius.lg, overflow: 'hidden' },
  listCard: { paddingVertical: 0 },
  inline: { flexDirection: 'row' },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  wifiAction: { paddingBottom: Spacing.md },
  billCard: { borderRadius: Radius.lg, padding: Spacing.md },
  billTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  billBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: TapTarget },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
});
