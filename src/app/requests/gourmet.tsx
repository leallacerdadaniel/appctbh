import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  DateChips,
  FieldLabel,
  hourOf,
  hourSlots,
  nextDays,
  requestHref,
  Stepper,
  TimeChips,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatTime } from '@/lib/format';
import { bookGourmet } from '@/store/actions';
import { gourmetSpace } from '@/store/seed';
import type { HourMinute, IsoDate } from '@/store/types';

const MAX_HOURS = 4;
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Booking of the building's gourmet space: day, start/end within opening hours, guests. */
export default function GourmetScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const r = t.requests;

  const dates = useMemo(() => nextDays(21, 1), []);
  const [date, setDate] = useState<IsoDate>(dates[0]);
  const [start, setStart] = useState<HourMinute | undefined>();
  const [end, setEnd] = useState<HourMinute | undefined>();
  const [guests, setGuests] = useState(4);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  if (!gourmetSpace) {
    return (
      <Screen back title={r.gourmetTitle}>
        <Card>
          <AppText color={theme.textSecondary}>{r.notFound}</AppText>
        </Card>
      </Screen>
    );
  }
  const space = gourmetSpace;

  const closing = hourOf(space.openUntil);
  const starts = hourSlots(space.openFrom, pad(closing - 1));
  const ends = start ? hourSlots(pad(hourOf(start) + 1), pad(Math.min(hourOf(start) + MAX_HOURS, closing))) : [];

  async function submit() {
    if (!start || !end) return;
    setSending(true);
    setError(false);
    try {
      const req = await bookGourmet({ date, startTime: start, endTime: end, guests, note });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch {
      setError(true);
      setSending(false);
    }
  }

  return (
    <Screen back title={space.name[lang]} subtitle={r.gourmetSubtitle}>
      <Card style={styles.infoCard}>
        <ListGroup inset>
          <ListRow icon="people" title={r.capacity} value={r.capacityValue(space.capacity)} />
          <ListRow
            icon="clock"
            title={r.hours}
            value={r.hoursValue(formatTime(space.openFrom, lang), formatTime(space.openUntil, lang))}
          />
          <ListRow icon="rules" title={r.rules} subtitle={space.rules[lang]} />
        </ListGroup>
      </Card>

      <Section title={r.date}>
        <DateChips dates={dates} value={date} onChange={setDate} />
      </Section>

      <Section title={r.time} subtitle={r.maxHours}>
        <View style={styles.group}>
          <FieldLabel>{r.start}</FieldLabel>
          <TimeChips
            times={starts}
            value={start}
            onChange={(s) => {
              setStart(s);
              const h = hourOf(s);
              if (!end || hourOf(end) <= h || hourOf(end) > h + MAX_HOURS) setEnd(undefined);
            }}
          />
        </View>
        {start && (
          <View style={styles.group}>
            <FieldLabel>{r.end}</FieldLabel>
            <TimeChips times={ends} value={end} onChange={setEnd} />
          </View>
        )}
      </Section>

      <Section title={r.guests}>
        <Stepper value={guests} max={space.capacity} onChange={setGuests} format={r.guestsValue} />
      </Section>

      <Input label={r.note} value={note} onChangeText={setNote} multiline style={styles.multiline} />

      {error && <InlineMessage kind="error" text={r.error} />}

      <Button label={r.confirm} onPress={submit} loading={sending} disabled={!start || !end} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: { paddingVertical: 0 },
  group: { gap: Spacing.sm },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
});
