import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  addDays,
  bhInstant,
  bhToday,
  DateChips,
  FieldLabel,
  hourSlots,
  longDayLabel,
  Notice,
  requestErrorText,
  requestHref,
  RequestsGate,
  TimeChips,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { formatTime } from '@/lib/format';
import { useRequestActions, type Stay } from '@/lib/requests';

type Kind = 'late_checkout' | 'early_checkin';

const OPTIONS: Record<Kind, string[]> = {
  late_checkout: hourSlots('12:00', '18:00'),
  early_checkin: hourSlots('06:00', '13:00'),
};

/** Late check-out (?kind=late_checkout) or early check-in (?kind=early_checkin): planned day, wanted time, fee rule. */
export default function StayChangeScreen() {
  const { t } = useI18n();
  const r = t.requests;
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = params.kind === 'early_checkin' ? 'early_checkin' : 'late_checkout';
  const late = kind === 'late_checkout';

  return (
    <Screen
      back
      title={r.kinds[kind]}
      subtitle={late ? r.lateCheckoutSubtitle : r.earlyCheckinSubtitle}>
      <RequestsGate>{(data) => <Form kind={kind} stay={data.stay} />}</RequestsGate>
    </Screen>
  );
}

function Form({ kind, stay }: { kind: Kind; stay: Stay }) {
  const toast = useToast();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { create } = useRequestActions();
  const late = kind === 'late_checkout';

  const [{ now, today }] = useState(() => ({ now: Date.now(), today: bhToday() }));
  // No date on file yet: the student says which day, the team confirms it.
  const [choices] = useState(() => Array.from({ length: 30 }, (_, i) => addDays(today, i)));
  const [chosenDay, setChosenDay] = useState<string>();
  const [time, setTime] = useState<string>();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planned = late ? stay.departureDate : stay.arrivalDate;
  const plannedTime = late ? stay.departureTime : stay.arrivalTime;
  const passed = !!planned && planned < today;
  const date = planned ?? chosenDay;
  // On the day itself, only the hours still ahead.
  const times = date === today ? OPTIONS[kind].filter((s) => bhInstant(today, s) > now) : OPTIONS[kind];
  const chosenTime = time && times.includes(time) ? time : undefined;

  async function submit() {
    if (!date || !chosenTime) return;
    setError(null);
    setSending(true);
    try {
      const req = await create({ kind, date, time: chosenTime, note: note.trim() || undefined });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch (e) {
      setError(requestErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <>
      <Section title={r.planned}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="calendar"
              title={late ? r.moveOutDay : r.moveInDay}
              value={planned ? longDayLabel(planned, lang) : r.toConfirm}
            />
            {plannedTime && <ListRow icon="clock" title={r.plannedTime} value={formatTime(plannedTime, lang)} />}
          </ListGroup>
        </Card>
      </Section>

      {passed ? (
        <Card>
          <Notice icon="info" text={r.datePassed} />
        </Card>
      ) : (
        <>
          <Card style={styles.form}>
            {!planned && (
              <View style={styles.group}>
                <Notice icon="info" text={r.dateUnknown} />
                <FieldLabel>{r.wantedDay}</FieldLabel>
                <DateChips dates={choices} value={chosenDay} onChange={setChosenDay} />
              </View>
            )}
            <View style={styles.group}>
              <FieldLabel>{r.wantedTime}</FieldLabel>
              {times.length ? (
                <TimeChips times={times} value={chosenTime} onChange={setTime} />
              ) : (
                <Notice icon="info" text={r.noTimesToday} />
              )}
            </View>
            <Notice icon="wallet" text={r.feeInfo} />
            <Input
              label={r.note}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              style={styles.multiline}
            />
          </Card>

          {error && <InlineMessage kind="error" text={error} />}
          <Button label={r.send} onPress={submit} loading={sending} disabled={!date || !chosenTime} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  form: { gap: Spacing.lg },
  group: { gap: Spacing.sm },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
});
