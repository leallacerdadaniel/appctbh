import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { DateChips, FieldLabel } from '@/components/request-ui';
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
  usePackages,
  type Parcel,
} from '@/lib/house-social';

/** Days offered as chips for the expected delivery. */
const DAYS_AHEAD = 45;

/** New package, or change one still expected (?id=): what, carrier or store, expected day. */
export default function PackageEditScreen() {
  const { t } = useI18n();
  const c = t.houseSocial.packages;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, reload } = usePackages();
  // Once deleted or picked up, the form stays on screen while it closes.
  const [leaving, setLeaving] = useState(false);

  if (!id) {
    return (
      <Screen back title={c.newTitle}>
        <Form onLeave={() => setLeaving(true)} />
      </Screen>
    );
  }

  const existing =
    state.status === 'ready' ? state.data.packages.find((p) => p.id === id && p.status === 'expected') : undefined;
  return (
    <Screen back title={c.editTitle}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={c.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' &&
        (!existing && !leaving ? (
          <Card>
            <AppText>{c.notFound}</AppText>
          </Card>
        ) : (
          <Form existing={existing} onLeave={() => setLeaving(true)} />
        ))}
    </Screen>
  );
}

function Form({ existing: current, onLeave }: { existing?: Parcel; onLeave: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const c = t.houseSocial.packages;
  const act = useHouseSocialActions();
  // Read once: the package leaves the "expected" list after a delete, the form doesn't change meanwhile.
  const [existing] = useState(current);
  const [today] = useState(todayInBH);

  const [description, setDescription] = useState(existing?.description ?? '');
  const [carrier, setCarrier] = useState(existing?.carrier ?? '');
  const [date, setDate] = useState<string | null>(existing?.expectedDate ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'picked' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const dates = useMemo(() => {
    const list = Array.from({ length: DAYS_AHEAD }, (_, i) => plusDays(today, i));
    const kept = existing?.expectedDate;
    return kept && !list.includes(kept) ? [kept, ...list].sort() : list;
  }, [existing, today]);

  async function save() {
    setError(null);
    if (!description.trim()) return setError(t.houseSocial.errors.what);
    setBusy('save');
    try {
      await act.saveParcel({
        id: existing?.id,
        description: description.trim(),
        carrier: carrier.trim() || null,
        expectedDate: date,
      });
      toast(c.saved);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'server'));
      setBusy(null);
    }
  }

  async function picked() {
    if (!existing) return;
    setBusy('picked');
    setError(null);
    try {
      await act.parcelPicked(existing.id);
      onLeave();
      toast(c.picked);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'action'));
      setBusy(null);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!confirmRemove) return setConfirmRemove(true);
    setBusy('remove');
    setError(null);
    try {
      await act.cancelParcel(existing.id);
      onLeave();
      toast(c.removed);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'action'));
      setBusy(null);
      setConfirmRemove(false);
    }
  }

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <Input
          label={c.what}
          placeholder={c.whatPlaceholder}
          value={description}
          onChangeText={setDescription}
          maxLength={80}
          autoCapitalize="sentences"
        />
        <Input
          label={c.carrier}
          placeholder={c.carrierPlaceholder}
          value={carrier}
          onChangeText={setCarrier}
          maxLength={60}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <FieldLabel hint={c.dayHint}>{c.day}</FieldLabel>
        <DateChips dates={dates} value={date ?? undefined} onChange={(d) => setDate(d === date ? null : d)} />
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <View style={{ gap: Spacing.sm }}>
        <Button label={c.save} onPress={save} loading={busy === 'save'} disabled={!!busy} />
        {existing && (
          <>
            <Button
              variant="secondary"
              label={c.alreadyPicked}
              onPress={picked}
              loading={busy === 'picked'}
              disabled={!!busy}
            />
            <Button
              variant="plain"
              label={confirmRemove ? c.confirmRemove : c.remove}
              onPress={remove}
              loading={busy === 'remove'}
              disabled={!!busy}
            />
          </>
        )}
      </View>
    </>
  );
}
