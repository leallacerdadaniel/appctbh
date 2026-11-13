import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { DateChips, FieldLabel, hourSlots, TimeChips } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import {
  houseSocialErrorText,
  plusDays,
  todayInBH,
  useHouseSocialActions,
  useVisitors,
  type Visitor,
} from '@/lib/house-social';

/** Days offered as chips (the server accepts up to 180 days ahead). */
const DAYS_AHEAD = 45;
/** "Vers 20h": whole hours are enough for the porteiro. */
const TIMES = hourSlots('08:00', '23:00');

/** New visit, or change one (?id=): name, day, optional time and a note that stays in the app. */
export default function VisitorEditScreen() {
  const { t } = useI18n();
  const v = t.houseSocial.visitors;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, reload } = useVisitors();
  // Once cancelled, the form stays on screen while it closes (no "doesn't exist" flash).
  const [leaving, setLeaving] = useState(false);

  if (!id) {
    return (
      <Screen back title={v.newTitle}>
        <Form onLeave={() => setLeaving(true)} />
      </Screen>
    );
  }

  const existing =
    state.status === 'ready' ? state.data.visitors.find((x) => x.id === id && x.date >= todayInBH()) : undefined;
  return (
    <Screen back title={v.editTitle}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={v.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' &&
        (!existing && !leaving ? (
          <Card>
            <AppText>{v.notFound}</AppText>
          </Card>
        ) : (
          <Form existing={existing} onLeave={() => setLeaving(true)} />
        ))}
    </Screen>
  );
}

function Form({ existing: current, onLeave }: { existing?: Visitor; onLeave: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const v = t.houseSocial.visitors;
  const act = useHouseSocialActions();
  // Read once: the visit leaves the list after a cancel, the form doesn't change meanwhile.
  const [existing] = useState(current);
  const [today] = useState(todayInBH);

  const [name, setName] = useState(existing?.name ?? '');
  const [date, setDate] = useState<string | undefined>(existing?.date);
  const [time, setTime] = useState<string | null>(existing?.time ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const dates = useMemo(() => {
    const list = Array.from({ length: DAYS_AHEAD }, (_, i) => plusDays(today, i));
    return existing && !list.includes(existing.date) ? [...list, existing.date] : list;
  }, [existing, today]);
  const times = useMemo(
    () => (existing?.time && !TIMES.includes(existing.time) ? [...TIMES, existing.time].sort() : TIMES),
    [existing],
  );

  async function save() {
    setError(null);
    if (!name.trim()) return setError(t.houseSocial.errors.name);
    if (!date) return setError(t.houseSocial.errors.date);
    setSaving(true);
    const changed =
      !!existing?.notifiedAt && (existing.name !== name.trim() || existing.date !== date || existing.time !== time);
    try {
      await act.saveVisitor({ id: existing?.id, name: name.trim(), date, time, note: note.trim() || null });
      toast(!existing ? v.saved : changed ? v.changedNotice : v.updated);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'server'));
      setSaving(false);
    }
  }

  async function cancelVisit() {
    if (!existing) return;
    if (!confirmCancel) return setConfirmCancel(true);
    setSaving(true);
    setError(null);
    try {
      await act.cancelVisitor(existing.id);
      onLeave();
      toast(v.cancelled);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'action'));
      setSaving(false);
      setConfirmCancel(false);
    }
  }

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <Input
          label={v.name}
          placeholder={v.namePlaceholder}
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <FieldLabel>{v.day}</FieldLabel>
        <DateChips dates={dates} value={date} onChange={setDate} />
        <FieldLabel hint={v.timeHint}>{v.time}</FieldLabel>
        <TimeChips times={times} value={time ?? undefined} onChange={(x) => setTime(x === time ? null : x)} />
      </Card>

      <Card>
        <Input
          label={v.note}
          placeholder={v.notePlaceholder}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          autoCapitalize="sentences"
        />
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <View style={{ gap: Spacing.sm }}>
        <Button label={v.save} onPress={save} loading={saving && !confirmCancel} disabled={saving} />
        {existing && (
          <Button
            variant="secondary"
            label={confirmCancel ? v.confirmCancel : v.cancelVisit}
            onPress={cancelVisit}
            loading={saving && confirmCancel}
            disabled={saving}
          />
        )}
      </View>
    </>
  );
}
