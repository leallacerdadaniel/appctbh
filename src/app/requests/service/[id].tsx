import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  bookableDays,
  DateChips,
  dayLabel,
  FieldLabel,
  hourSlots,
  Notice,
  rentMonthLabel,
  requestErrorText,
  useOpenSentRequest,
  RequestsGate,
  Stepper,
  TimeChips,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatCents, formatTime } from '@/lib/format';
import {
  AppApiError,
  billingMonthFor,
  localized,
  useRequestActions,
  useRequests,
  type CatalogItem,
} from '@/lib/requests';

/** Hours offered for every extra service (Belo Horizonte time). */
const SLOTS = hourSlots('08:00', '18:00');

/** Order form for one extra of the catalog: quantity, day and hour, note, then the bill line. */
export default function ServiceOrderScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useRequests();
  const svc = state.status === 'ready' ? state.data.catalog.find((c) => c.id === id) : undefined;

  return (
    <Screen
      back
      title={svc ? localized(svc.name, lang) : t.requests.newTitle}
      subtitle={svc ? localized(svc.description, lang) : undefined}>
      <RequestsGate>
        {() =>
          svc ? (
            <Form svc={svc} />
          ) : (
            <Card>
              <AppText color={theme.textSecondary}>{t.requests.serviceGone}</AppText>
            </Card>
          )
        }
      </RequestsGate>
    </Screen>
  );
}

function Form({ svc }: { svc: CatalogItem }) {
  const theme = useTheme();
  const toast = useToast();
  const openSent = useOpenSentRequest();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { create } = useRequestActions();

  const [now, setNow] = useState(() => Date.now());
  const days = useMemo(() => bookableDays(SLOTS, svc.leadTimeHours, 21, now), [svc.leadTimeHours, now]);
  const [date, setDate] = useState<string | undefined>(days[0]?.date);
  const [time, setTime] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = localized(svc.name, lang);
  const unit = localized(svc.unit, lang);
  const money = (cents: number) => formatCents(cents, lang, svc.currency);
  const times = days.find((d) => d.date === date)?.times ?? [];
  const ready = !!date && !!time && times.includes(time);
  const total = quantity * svc.priceCents;

  async function confirm() {
    if (!date || !time) return;
    setError(null);
    setSending(true);
    try {
      const req = await create({
        kind: 'service',
        serviceId: svc.id,
        date,
        time,
        quantity: svc.allowsQuantity ? quantity : 1,
        note: note.trim() || undefined,
      });
      toast(r.sent);
      openSent(req.id);
    } catch (e) {
      if (e instanceof AppApiError && e.code === 'tooSoon') {
        // The slot went past the notice while the form was open: refresh the choices.
        const fresh = Date.now();
        const next = bookableDays(SLOTS, svc.leadTimeHours, 21, fresh);
        setNow(fresh);
        setTime(undefined);
        if (!next.some((d) => d.date === date)) setDate(next[0]?.date);
      }
      setError(requestErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <>
      <Card style={styles.listCard}>
        <ListGroup>
          <ListRow title={r.unitPrice} value={r.priceUnit(money(svc.priceCents), unit)} />
          {svc.allowsQuantity && (
            <ListRow
              title={r.quantity}
              subtitle={unit}
              accessory={<Stepper value={quantity} max={svc.maxQuantity} onChange={setQuantity} />}
            />
          )}
        </ListGroup>
      </Card>

      <Section title={r.dateTime} subtitle={r.leadTime(svc.leadTimeHours)}>
        <Card style={styles.form}>
          {days.length ? (
            <>
              <DateChips
                dates={days.map((d) => d.date)}
                value={date}
                onChange={(d) => {
                  setDate(d);
                  if (time && !days.find((x) => x.date === d)?.times.includes(time)) setTime(undefined);
                }}
              />
              <View style={styles.group}>
                <FieldLabel>{r.time}</FieldLabel>
                <TimeChips times={times} value={time} onChange={setTime} />
              </View>
            </>
          ) : (
            <Notice icon="info" text={r.noSlots} />
          )}
        </Card>
      </Section>

      <Card>
        <Input
          label={r.note}
          placeholder={r.notePlaceholder}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
          style={styles.multiline}
        />
      </Card>

      <Section title={r.summary}>
        <Card style={styles.summary}>
          <View style={{ gap: 2 }}>
            <AppText>{svc.allowsQuantity ? `${quantity} × ${name}` : name}</AppText>
            {date && time && ready && (
              <AppText variant="callout" color={theme.textSecondary}>
                {dayLabel(date, lang)} · {formatTime(time, lang)}
              </AppText>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.line }]} />
          <View style={styles.totalRow}>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{r.total}</AppText>
            <AppText variant="title">{money(total)}</AppText>
          </View>
          {date && (
            <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
              {r.billedWith(rentMonthLabel(billingMonthFor(date), lang))}
            </AppText>
          )}
          <AppText variant="caption" color={theme.textSecondary}>
            {r.noPaymentNow}
          </AppText>
        </Card>
      </Section>

      {error && <InlineMessage kind="error" text={error} />}
      <Button label={r.confirm} onPress={confirm} loading={sending} disabled={!ready} />
    </>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  form: { gap: Spacing.md },
  group: { gap: Spacing.sm },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  summary: { gap: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
});
