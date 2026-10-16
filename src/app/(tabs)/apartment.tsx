import * as Clipboard from 'expo-clipboard';
import { Copy, Download, Eye, EyeOff, FileText, MapPin, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Reveal, Screen, SectionLabel } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, InlineMessage, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { downloadDocument, openDocument, type AppDocument } from '@/lib/documents';
import { formatBrl, formatDate } from '@/lib/format';
import { demoApartment, demoContract, demoContractDocument, demoRoommates } from '@/lib/mock-data';

export default function ApartmentScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [showWifi, setShowWifi] = useState(false);

  async function copy(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    toast(message);
  }

  const fullAddress = `${demoApartment.address}, ${demoApartment.complement} — ${demoApartment.neighborhood}, ${demoApartment.city}`;

  return (
    <Screen title={demoApartment.nickname} subtitle={`${demoApartment.neighborhood}, ${demoApartment.city}`}>
      <Reveal index={0}>
        <SectionLabel>{t.apartment.address}</SectionLabel>
      </Reveal>
      <Reveal index={1}>
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.line}>
            <MapPin size={20} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{demoApartment.address}</AppText>
              <AppText variant="caption" color={theme.textSecondary}>
                {demoApartment.complement}
              </AppText>
            </View>
            <IconButton label={t.apartment.copyAddress} onPress={() => copy(fullAddress, t.apartment.addressCopied)}>
              <Copy size={18} color={theme.text} />
            </IconButton>
          </View>
          <Button
            variant="secondary"
            label={t.apartment.openMaps}
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(demoApartment.mapsQuery)}`,
              )
            }
          />
        </Card>
      </Reveal>

      <Reveal index={2}>
        <SectionLabel>{t.apartment.wifi}</SectionLabel>
      </Reveal>
      <Reveal index={3}>
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.line}>
            <Wifi size={20} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={theme.textSecondary}>
                {t.apartment.network}
              </AppText>
              <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{demoApartment.wifiName}</AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.line }]} />
          <View style={styles.line}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={theme.textSecondary}>
                {t.apartment.password}
              </AppText>
              <AppText style={{ fontFamily: Fonts.bodySemiBold, letterSpacing: showWifi ? 0 : 2 }}>
                {showWifi ? demoApartment.wifiPassword : '••••••••••'}
              </AppText>
            </View>
            <IconButton
              label={showWifi ? t.apartment.hide : t.apartment.show}
              onPress={() => setShowWifi((v) => !v)}>
              {showWifi ? <EyeOff size={18} color={theme.text} /> : <Eye size={18} color={theme.text} />}
            </IconButton>
            <IconButton
              label={t.apartment.copyPassword}
              onPress={() => copy(demoApartment.wifiPassword, t.apartment.passwordCopied)}>
              <Copy size={18} color={theme.text} />
            </IconButton>
          </View>
        </Card>
      </Reveal>

      <Reveal index={4}>
        <SectionLabel>{t.apartment.roommates}</SectionLabel>
      </Reveal>
      <Reveal index={5}>
        <Card style={{ gap: Spacing.md }}>
          {demoRoommates.map((r) => (
            <View key={r.name} style={styles.line}>
              <Avatar initials={r.initials} />
              <AppText>{r.name}</AppText>
            </View>
          ))}
        </Card>
      </Reveal>

      <Reveal index={6}>
        <SectionLabel>{t.apartment.contract}</SectionLabel>
      </Reveal>
      <Reveal index={7}>
        <Card style={{ gap: Spacing.sm }}>
          <Row label={t.apartment.semester} value={demoContract.semester} />
          <Row label={t.apartment.moveIn} value={formatDate(demoContract.moveIn, lang)} />
          <Row label={t.apartment.moveOut} value={formatDate(demoContract.moveOut, lang)} />
          <Row label={t.apartment.monthlyRent} value={formatBrl(demoContract.monthlyRentBrl, lang)} />
        </Card>
      </Reveal>
      <Reveal index={8}>
        <DocumentCard doc={demoContractDocument} />
      </Reveal>
    </Screen>
  );
}

function DocumentCard({ doc }: { doc: AppDocument }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState<'open' | 'download' | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: 'open' | 'download') {
    setBusy(action);
    setFailed(false);
    try {
      if (action === 'open') await openDocument(doc);
      else {
        await downloadDocument(doc);
        // Native shows the share sheet itself; web saves silently, so confirm it.
        if (Platform.OS === 'web') toast(t.apartment.downloaded);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const size = doc.sizeBytes ? ` · ${Math.max(1, Math.round(doc.sizeBytes / 1024))} ${t.apartment.kilobytes}` : '';

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.line}>
        <View style={[styles.docIcon, { backgroundColor: theme.brandSoft }]}>
          <FileText size={22} color={theme.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: Fonts.bodySemiBold }} numberOfLines={1}>
            {doc.fileName}
          </AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.apartment.document}
            {size}
          </AppText>
        </View>
      </View>
      <View style={styles.docActions}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            label={t.apartment.open}
            icon={<Eye size={18} color={theme.text} />}
            loading={busy === 'open'}
            disabled={busy !== null}
            onPress={() => run('open')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t.apartment.download}
            icon={<Download size={18} color={theme.onBrand} />}
            loading={busy === 'download'}
            disabled={busy !== null}
            onPress={() => run('download')}
          />
        </View>
      </View>
      {failed && <InlineMessage kind="error" text={t.apartment.documentError} />}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <AppText color={theme.textSecondary}>{label}</AppText>
      <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{value}</AppText>
    </View>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: theme.background }]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docActions: { flexDirection: 'row', gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
