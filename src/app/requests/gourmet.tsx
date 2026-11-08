import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  addDays,
  bhToday,
  DateChips,
  FieldLabel,
  fromMinutes,
  requestErrorText,
  requestHref,
  RequestsGate,
  Stepper,
  TimeChips,
  toMinutes,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatTime } from '@/lib/format';
import { localized, useRequestActions, useRequests, type Gourmet } from '@/lib/requests';

/** "10:00", "11:00"… from `from` while ≤ `to` (minutes since midnight). */
const everyHour = (from: number, to: number) => {
  const out: string[] = [];
  for (let m = from; m <= to; m += 60) out.push(fromMinutes(m));
  return out;
};

/** Booking of the building's gourmet space: day (from tomorrow), start and end within opening hours, people. */
export default function GourmetScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { state } = useRequests();
  const space = state.status === 'ready' ? state.data.gourmet : null;

  return (
    <Screen
      back
      title={space ? localized(space.name, lang) || r.kinds.gourmet : r.kinds.gourmet}
      subtitle={r.gourmetSubtitle}>
      <RequestsGate>
        {(data) =>
          data.gourmet ? (
            <Form space={data.gourmet} />
          ) : (
            <Card>
              <AppText color={theme.textSecondary}>{r.serviceGone}</AppText>
            </Card>
          )
        }
      </RequestsGate>
    </Screen>
  );
}

function Form({ space }: { space: Gourmet }) {
  const toast = useToast();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { create } = useRequestActions();

  const [dates] = useState(() => {
    const tomorrow = addDays(bhToday(), 1);
    return Array.from({ length: 21 }, (_, i) => addDays(tomorrow, i));
  });
  const [date, setDate] = useState(dates[0]);
  const [start, setStart] = useState<string>();
  const [end, setEnd] = useState<string>();
  const [guests, setGuests] = useState(Math.min(4, space.capacity));
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opens = toMinutes(space.openFrom);
  const closes = toMinutes(space.openUntil);
  const starts = everyHour(opens, closes - 60);
  const ends = start ? everyHour(toMinutes(start) + 60, Math.min(toMinutes(start) + space.maxHours * 60, closes)) : [];

  async function submit() {
    if (!start || !end) return;
    setError(null);
    setSending(true);
    try {
      const req = await create({ kind: 'gourmet', date, startTime: start, endTime: end, guests, note: note.trim() || undefined });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch (e) {
      setError(requestErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <>
      <Card style={styles.listCard}>
        <ListGroup inset>
          <ListRow icon="people" title={r.capacity} value={r.people(space.capacity)} />
          <ListRow
            icon="clock"
            title={r.hours}
            value={r.timeRange(formatTime(space.openFrom, lang), formatTime(space.openUntil, lang))}
          />
          {localized(space.rules, lang) ? (
            <ListRow icon="document" title={r.rules} subtitle={localized(space.rules, lang)} />
          ) : null}
        </ListGroup>
      </Card>

      <Section title={r.date}>
        <Card>
          <DateChips
            dates={dates}
            value={date}
            onChange={(d) => {
              setDate(d);
              setError(null);
            }}
          />
        </Card>
      </Section>

      <Section title={r.schedule} subtitle={r.maxHours(space.maxHours)}>
        <Card style={styles.form}>
          <View style={styles.group}>
            <FieldLabel>{r.start}</FieldLabel>
            <TimeChips
              times={starts}
              value={start}
              onChange={(s) => {
                setStart(s);
                setError(null);
                const from = toMinutes(s);
                if (end && (toMinutes(end) <= from || toMinutes(end) > from + space.maxHours * 60)) setEnd(undefined);
              }}
            />
          </View>
          {start && (
            <View style={styles.group}>
              <FieldLabel>{r.end}</FieldLabel>
              <TimeChips
                times={ends}
                value={end}
                onChange={(e) => {
                  setEnd(e);
                  setError(null);
                }}
              />
            </View>
          )}
        </Card>
      </Section>

      <Card style={styles.form}>
        <ListGroup>
          <ListRow
            title={r.guests}
            accessory={<Stepper value={guests} max={space.capacity} onChange={setGuests} format={r.people} />}
          />
        </ListGroup>
        <Input label={r.note} value={note} onChangeText={setNote} multiline maxLength={500} style={styles.multiline} />
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <Button label={r.book} onPress={submit} loading={sending} disabled={!start || !end} />
    </>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  form: { gap: Spacing.md },
  group: { gap: Spacing.sm },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
});
