import * as Clipboard from 'expo-clipboard';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, LoadingState, PressableScale, RetryCard } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { noticeText } from '@/lib/notices';
import { documentKind, pixKind, type PaymentInfo, type usePaymentInfo } from '@/lib/payment-info';
import { openWhatsApp } from '@/lib/whatsapp';

type Row = { label: string; value: string };

const filled = (v: string | null | undefined): v is string => !!v?.trim();

/**
 * "Comment payer" on the payments page: the Pix key first (most students pay by Pix), the bank
 * details, the euro account (Wise) when there is one, the team's note and "send the receipt".
 * Only what the team filled in is shown; nothing at all while there is no payment info.
 */
export function HowToPay({ state, reload }: ReturnType<typeof usePaymentInfo>) {
  const { t } = useI18n();
  const p = t.payInfo;

  if (state.status === 'ready' && !state.info) return null;
  return (
    <Section title={p.title} subtitle={p.hint}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={p.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && state.info && <Details info={state.info} />}
    </Section>
  );
}

function Details({ info }: { info: PaymentInfo }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const p = t.payInfo;

  async function copy(value: string, message = t.common.copied) {
    await Clipboard.setStringAsync(value.trim());
    toast(message);
  }

  const kind = pixKind(info.pixKeyType);
  const pixLabel = [p.pixKey, kind ? p.pixTypes[kind] : info.pixKeyType?.trim()].filter(Boolean).join(' · ');
  const docKind = filled(info.document) ? documentKind(info.document) : null;

  const bank: Row[] = [
    filled(info.beneficiary) && { label: p.beneficiary, value: info.beneficiary.trim() },
    filled(info.document) && { label: docKind ? p[docKind] : p.document, value: info.document.trim() },
    filled(info.bank) && { label: p.bank, value: info.bank.trim() },
    filled(info.agency) && { label: p.agency, value: info.agency.trim() },
    filled(info.account) && { label: p.account, value: info.account.trim() },
  ].filter((r): r is Row => !!r);

  // The euro block only makes sense with an IBAN.
  const eur: Row[] = filled(info.eurIban)
    ? [
        filled(info.eurAccountHolder) && { label: p.eurHolder, value: info.eurAccountHolder.trim() },
        { label: p.iban, value: info.eurIban.trim() },
        filled(info.eurSwift) && { label: p.swift, value: info.eurSwift.trim() },
      ].filter((r): r is Row => !!r)
    : [];

  const notes = noticeText(info.notes, lang);

  const rows = (list: Row[]) => (
    <ListGroup>
      {list.map((r) => (
        <ListRow
          key={r.label}
          title={r.label}
          subtitle={r.value}
          subtitleColor={theme.text}
          accessory={<CopyButton label={p.copy(r.label)} onPress={() => copy(r.value)} />}
        />
      ))}
    </ListGroup>
  );

  return (
    <>
      {filled(info.pixKey) && (
        <Card style={{ gap: Spacing.sm, paddingTop: 0 }}>
          <ListRow icon="pix" title={pixLabel} subtitle={info.pixKey.trim()} subtitleColor={theme.text} />
          <Button
            variant="secondary"
            label={p.copyPix}
            icon={<Icon name="copy" size={17} color={theme.text} />}
            onPress={() => copy(info.pixKey!, p.pixCopied)}
          />
        </Card>
      )}

      {bank.length > 0 && <Card style={styles.listCard}>{rows(bank)}</Card>}

      {eur.length > 0 && (
        <Card style={styles.listCard}>
          <View style={styles.cardHead}>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{p.eurTitle}</AppText>
            <AppText variant="callout" color={theme.textSecondary}>
              {p.eurHint}
            </AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.line }]} />
          {rows(eur)}
        </Card>
      )}

      <Card style={{ gap: Spacing.md }}>
        {notes ? (
          <AppText variant="callout" color={theme.textSecondary}>
            {notes}
          </AppText>
        ) : null}
        <Button
          variant="secondary"
          label={p.sendReceipt}
          icon={<Icon name="whatsapp" size={17} color={theme.text} />}
          onPress={() => openWhatsApp('payments', p.receiptMessage)}
        />
      </Card>
    </>
  );
}

function CopyButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.copy}>
      <Icon name="copy" size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  cardHead: { gap: 2, paddingTop: Spacing.md, paddingBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  copy: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
