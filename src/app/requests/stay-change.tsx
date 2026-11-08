import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import { hourOf, hourSlots, longDate, Notice, requestHref, TimeChips } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, InlineMessage, Input } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime } from '@/lib/format';
import { requestStayChange } from '@/store/actions';
import { isoDate } from '@/store/dates';
import { stay } from '@/store/seed';
import type { HourMinute } from '@/store/types';

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Late check-out or early check-in: the contract time, the time wanted, and the fee rule. */
export default function StayChangeScreen() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const r = t.requests;
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === 'early_checkin' ? 'early_checkin' : 'late_checkout';
  const late = kind === 'late_checkout';

  const date = late ? stay.moveOut : stay.moveIn;
  const contractTime = late ? stay.checkOutTime : stay.checkInTime;
  const options: HourMinute[] = late
    ? hourSlots(pad(hourOf(contractTime) + 1), '20:00')
    : hourSlots('06:00', pad(hourOf(contractTime) - 1));
  const passed = date < isoDate(new Date());

  const [time, setTime] = useState<HourMinute | undefined>(options[0]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (!time) return;
    setSending(true);
    setError(false);
    try {
      const req = await requestStayChange({ kind, date, time, note });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch {
      setError(true);
      setSending(false);
    }
  }

  return (
    <Screen
      back
      title={late ? r.lateCheckoutTitle : r.earlyCheckinTitle}
      subtitle={late ? r.lateCheckoutSubtitle : r.earlyCheckinSubtitle}>
      <Section title={r.contract}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow icon="calendar" title={late ? r.moveOutDay : r.moveInDay} value={longDate(date, lang)} />
            <ListRow icon="clock" title={r.contractTime} value={formatTime(contractTime, lang)} />
          </ListGroup>
        </Card>
      </Section>

      {passed ? (
        <Notice icon="info" text={r.datePassed} />
      ) : (
        <>
          <Section title={r.wantedTime}>
            <TimeChips times={options} value={time} onChange={setTime} />
          </Section>

          <Notice icon="wallet" text={r.feeInfo} />

          <Input
            label={r.note}
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.multiline}
          />

          {error && <InlineMessage kind="error" text={r.error} />}

          <Button label={r.send} onPress={submit} loading={sending} disabled={!time} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
});
