import * as Clipboard from 'expo-clipboard';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Card, PressableScale } from '@/components/ui';
import { TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useChores, useChoreStatus } from '@/lib/chores';
import { canRate, formatLongDate, pastCleanings, upcomingCleanings } from '@/lib/cleaning';
import { useBalanceLabel, useExpenses } from '@/lib/expenses';
import { formatTime, shortAddress } from '@/lib/format';
import { useHome, useHomeState } from '@/lib/home';
import { usePackages, usePackagesStatus, useVisitors, useVisitorsStatus } from '@/lib/house-social';
import { trackAction } from '@/lib/usage';
import { openWhatsApp } from '@/lib/whatsapp';

/**
 * "Maison": the apartment and life with the roommates, grouped by how often it is used
 * (structure by task, owner 2026-11-08). What the student asks, pays and signs with Chez Toi
 * (requests, payments, contract, check-in/out) lives in the Chez Toi tab.
 */
export default function MaisonScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [showWifi, setShowWifi] = useState(false);
  const { apartment, cleanings, roommates } = useHome();
  const { refresh } = useHomeState();
  const { reload: reloadExpenses } = useExpenses();
  const { reload: reloadChores } = useChores();
  const balance = useBalanceLabel();
  const choreStatus = useChoreStatus();
  const { reload: reloadVisitors } = useVisitors();
  const { reload: reloadPackages } = usePackages();
  const visitorsStatus = useVisitorsStatus();
  const packagesStatus = usePackagesStatus();

  async function copy(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    toast(message);
  }

  // The unit number gets its own row; the copied address still carries it (for deliveries / rides).
  const fullAddress = [apartment.address, apartment.complement].filter(Boolean).join(', ');
  const next = upcomingCleanings(cleanings)[0];
  const nextLabel = next
    ? [capitalize(formatLongDate(next.date, lang)), next.time && formatTime(next.time, lang)].filter(Boolean).join(' · ')
    : t.apartment.cleaning.empty;
  // Latest visit still inside its 7-day rating window.
  const toRate = pastCleanings(cleanings).find(canRate);

  return (
    <Screen
      title={t.tabs.maison}
      subtitle={t.maison.subtitle}
      onRefresh={() => Promise.all([refresh(), reloadExpenses(), reloadChores(), reloadVisitors(), reloadPackages()])}>
      <Section title={t.maison.daily} subtitle={t.maison.dailyHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {apartment.complement ? (
              <ListRow
                icon="apartment"
                title={t.apartment.unit}
                accessory={
                  <AppText variant="display" color={theme.brand}>
                    {apartment.complement}
                  </AppText>
                }
              />
            ) : null}
            <ListRow
              icon="address"
              title={t.apartment.address}
              subtitle={shortAddress(apartment.address)}
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
            <ListRow icon="wifi" title={t.apartment.network} value={apartment.wifiName ?? t.maison.wifiAsk} />
            {/* No password yet: the row asks the team on WhatsApp (never a "Bientôt disponible"). */}
            <ListRow
              icon="key"
              title={t.apartment.wifiPassword}
              subtitle={!apartment.wifiPassword ? t.maison.wifiAsk : showWifi ? apartment.wifiPassword : '••••••••••'}
              onPress={apartment.wifiPassword ? undefined : () => openWhatsApp('maison_wifi', t.maison.wifiAskMessage)}
              accessory={
                !apartment.wifiPassword ? undefined : (
                  <View style={styles.inline}>
                    <IconButton
                      icon={showWifi ? 'hide' : 'show'}
                      label={showWifi ? t.apartment.hide : t.apartment.show}
                      onPress={() => setShowWifi((v) => !v)}
                    />
                    <IconButton
                      icon="copy"
                      label={t.apartment.copyPassword}
                      onPress={() => {
                        trackAction('copy_wifi');
                        copy(apartment.wifiPassword ?? '', t.apartment.passwordCopied);
                      }}
                    />
                  </View>
                )
              }
            />
          </ListGroup>
        </Card>
        <HubGrid>
          {apartment.trash && (
            <HubTile
              emoji="🗑️"
              title={t.apartment.trash.title}
              status={t.apartment.trash.tileStatus}
              onPress={() => router.push('/apartment/trash')}
            />
          )}
          <HubTile
            emoji="📋"
            title={t.apartment.rules.title}
            status={t.apartment.rules.tileStatus}
            onPress={() => router.push('/apartment/rules')}
          />
        </HubGrid>
      </Section>

      <Section title={t.houseSocial.section} subtitle={t.houseSocial.sectionHint}>
        <HubGrid>
          <HubTile
            emoji="🚪"
            title={t.houseSocial.visitors.tile}
            status={visitorsStatus || t.houseSocial.visitors.tileEmpty}
            onPress={() => router.push('/house/visitors' as Href)}
          />
          <HubTile
            emoji="📦"
            title={t.houseSocial.packages.tile}
            status={packagesStatus || t.houseSocial.packages.tileEmpty}
            onPress={() => router.push('/house/packages' as Href)}
          />
        </HubGrid>
      </Section>

      {/* Nobody to take turns or split with, nobody to list, when the student lives alone. */}
      {roommates.length > 0 && (
        <Section title={t.maison.roommates} subtitle={t.maison.roommatesHint}>
          <HubGrid>
            <HubTile
              emoji="✅"
              title={t.chores.tile}
              status={choreStatus || t.chores.subtitle}
              onPress={() => router.push('/house/chores' as Href)}
            />
            <HubTile
              emoji="💸"
              title={t.expenses.tile}
              status={balance || t.expenses.subtitle}
              onPress={() => router.push('/expenses')}
            />
            <HubTile
              emoji="👥"
              title={t.maison.roommatesTile}
              status={roommates.map((r) => r.firstName).join(', ')}
              onPress={() => router.push('/apartment/roommates')}
            />
          </HubGrid>
        </Section>
      )}

      {/* The community in a section of its own (UX review 2026-11-09: it was hidden under "À l'immeuble"). */}
      <Section title={t.maison.residents} subtitle={t.community.subtitle}>
        <HubGrid>
          <HubTile
            emoji="🤝"
            title={t.community.hubRow}
            status={t.community.hubRowSubtitle}
            onPress={() => router.push('/community' as Href)}
          />
        </HubGrid>
      </Section>

      <Section title={t.maison.cleaning} subtitle={t.maison.cleaningHint}>
        <HubGrid>
          <HubTile
            emoji="🧹"
            title={t.apartment.cleaning.next}
            status={nextLabel}
            onPress={() => router.push('/apartment/cleaning')}
          />
          {toRate && (
            <HubTile
              emoji="⭐"
              title={t.maison.rateTile}
              status={
                toRate.feedback
                  ? t.maison.rated(toRate.feedback.rating)
                  : t.maison.rateStatus(formatLongDate(toRate.date, lang))
              }
              onPress={() => router.push({ pathname: '/apartment/feedback', params: { id: toRate.id ?? '' } })}
            />
          )}
        </HubGrid>
      </Section>
    </Screen>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  inline: { flexDirection: 'row' },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
});
