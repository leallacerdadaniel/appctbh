import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Card, PressableScale } from '@/components/ui';
import { Radius, Shadow, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatLongDate, upcomingCleanings } from '@/lib/cleaning';
import { formatDate, formatTime } from '@/lib/format';
import { useBalanceLabel } from '@/lib/expenses';
import { useHome } from '@/lib/home';

/**
 * "Mon appart" hub: photo, address, Wi‑Fi (used daily), then tiles to the sub-pages
 * (cleaning, contract, roommates, around). Each tile shows a live status line.
 */
export default function ApartmentScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [showWifi, setShowWifi] = useState(false);
  const { apartment, contract, roommates, cleanings } = useHome();
  const balance = useBalanceLabel();

  async function copy(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    toast(message);
  }

  const fullAddress = [apartment.address, apartment.complement].filter(Boolean).join(', ');
  const next = upcomingCleanings(cleanings)[0];
  const nextLabel = next
    ? t.apartment.nextCleaning(
        [capitalize(formatLongDate(next.date, lang)), next.time && formatTime(next.time, lang)].filter(Boolean).join(' · '),
      )
    : t.apartment.cleaning.empty;

  return (
    <Screen
      title={apartment.nickname}
      subtitle={apartment.complement || undefined}>
      <View style={[styles.photo, Shadow.card, { backgroundColor: theme.fill }]}>
        <Image
          source={apartment.photoUrl ? { uri: apartment.photoUrl } : undefined}
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
            subtitle={fullAddress}
            accessory={
              // Two actions side by side (a button can't sit inside a pressable row).
              <View style={styles.inline}>
                <IconButton
                  icon="directions"
                  label={t.apartment.openMaps}
                  onPress={() =>
                    Linking.openURL(
                      `https://maps.google.com/?q=${encodeURIComponent(apartment.mapsQuery)}`,
                    )
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
          <ListRow icon="wifi" title={t.apartment.network} value={apartment.wifiName ?? t.common.soon} />
          <ListRow
            icon="key"
            title={t.apartment.wifiPassword}
            subtitle={!apartment.wifiPassword ? t.common.soon : showWifi ? apartment.wifiPassword : '••••••••••'}
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
                  onPress={() => copy(apartment.wifiPassword ?? '', t.apartment.passwordCopied)}
                />
              </View>
              )
            }
          />
        </ListGroup>
      </Card>

      <Section title={t.apartment.info}>
        <HubGrid>
          <HubTile
            emoji="🧹"
            title={t.apartment.cleaning.title}
            status={nextLabel}
            onPress={() => router.push('/apartment/cleaning')}
          />
          <HubTile
            emoji="📄"
            title={t.apartment.contract}
            status={t.apartment.contractUntil(contract.semester, formatDate(contract.moveOut, lang))}
            onPress={() => router.push('/apartment/contract')}
          />
          <HubTile
            emoji="👥"
            title={t.apartment.roommates}
            status={roommates.map((r) => r.firstName).join(', ') || '—'}
            onPress={() => router.push('/apartment/roommates')}
          />
          <HubTile
            emoji="💸"
            title={t.expenses.tile}
            status={balance}
            onPress={() => router.push('/expenses')}
          />
          <HubTile
            emoji="📍"
            title={t.apartment.neighborhood}
            status={t.apartment.aroundHint}
            onPress={() => router.push('/nearby')}
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
});
