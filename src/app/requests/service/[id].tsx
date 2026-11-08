import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  billingMonthLabel,
  DateChips,
  FieldLabel,
  hourSlots,
  longDate,
  Notice,
  requestHref,
  slotsWithLeadTime,
  Stepper,
  TimeChips,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatTime } from '@/lib/format';
import { requestService } from '@/store/actions';
import { serviceById } from '@/store/selectors';
import type { HourMinute, IsoDate } from '@/store/types';

/** Service hours offered for every extra. */
const SLOTS = hourSlots('08:00', '18:00');
const MAX_QUANTITY = 10;

/** Order form for one extra of the catalog. */
export default function ServiceOrderScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const r = t.requests;
  const { id } = useLocalSearchParams<{ id: string }>();
  const svc = serviceById(id);

  const days = useMemo(() => (svc ? slotsWithLeadTime(svc.leadTimeHours, SLOTS) : []), [svc]);
  const [date, setDate] = useState<IsoDate | undefined>(days[0]?.date);
  const [time, setTime] = useState<HourMinute | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  if (!svc) {
    return (
      <Screen back title={r.newTitle}>
        <Card>
          <AppText color={theme.textSecondary}>{r.notFound}</AppText>
        </Card>
      </Screen>
    );
  }

  const times = days.find((d) => d.date === date)?.times ?? [];
  const total = Math.round(svc.priceBrl * quantity * 100) / 100;
  const ready = !!date && !!time && times.includes(time);

  async function confirm() {
    if (!svc || !date || !time) return;
    setSending(true);
    setError(false);
    try {
      const req = await requestService({ serviceId: svc.id, date, time, quantity, note });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch {
      setError(true);
      setSending(false);
    }
  }

  return (
    <Screen back title={svc.name[lang]} subtitle={svc.description[lang]}>
      <Card style={styles.listCard}>
        <ListGroup>
          <ListRow title={r.unitPrice} value={r.priceUnit(formatBrl(svc.priceBrl, lang), svc.unit[lang])} />
        </ListGroup>
      </Card>

      {svc.allowsQuantity && (
        <Section title={r.quantity} subtitle={svc.unit[lang]}>
          <Stepper value={quantity} max={MAX_QUANTITY} onChange={setQuantity} />
        </Section>
      )}

      <Section title={r.date} subtitle={r.leadTime(svc.leadTimeHours)}>
        {days.length ? (
          <View style={styles.group}>
            <DateChips
              dates={days.map((d) => d.date)}
              value={date}
              onChange={(d) => {
                setDate(d);
                if (time && !days.find((x) => x.date === d)?.times.includes(time)) setTime(undefined);
              }}
            />
            <FieldLabel>{r.time}</FieldLabel>
            <TimeChips times={times} value={time} onChange={setTime} />
          </View>
        ) : (
          <Notice icon="info" text={r.noSlots} />
        )}
      </Section>

      <Input
        label={r.note}
        placeholder={r.notePlaceholder}
        value={note}
        onChangeText={setNote}
        multiline
        style={styles.multiline}
      />

      <Section title={r.summary}>
        <Card style={styles.summary}>
          <View style={{ gap: 2 }}>
            <AppText>
              {svc.allowsQuantity ? `${quantity} × ${svc.name[lang]}` : svc.name[lang]}
            </AppText>
            {date && time && ready && (
              <AppText variant="callout" color={theme.textSecondary}>
                {longDate(date, lang)} · {formatTime(time, lang)}
              </AppText>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.line }]} />
          <View style={styles.totalRow}>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{r.total}</AppText>
            <AppText variant="title">{formatBrl(total, lang)}</AppText>
          </View>
          {date && (
            <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
              {r.billedWith(billingMonthLabel(date, lang))}
            </AppText>
          )}
          <AppText variant="caption" color={theme.textSecondary}>
            {r.noPaymentNow}
          </AppText>
        </Card>
      </Section>

      {error && <InlineMessage kind="error" text={r.error} />}

      <Button label={r.confirm} onPress={confirm} loading={sending} disabled={!ready} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  group: { gap: Spacing.md },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  summary: { gap: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
