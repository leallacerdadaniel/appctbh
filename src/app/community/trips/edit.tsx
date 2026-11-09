import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { addDays, bhToday, ChipWrap, DateChips, FieldLabel, Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  errorCode,
  tripLength,
  useCommunity,
  useCommunityActions,
  type Trip,
  type TripMember,
} from '@/lib/community';
import { hasLink } from '@/lib/no-links';
import { destinations } from '@/lib/travel';

const DAYS_AHEAD = 120;
const LENGTHS = [1, 2, 3, 4, 5, 7, 10];
const SEATS = [null, 3, 4, 5, 6, 8, 10, 15] as const;

/** Propose a group trip (or edit mine): where, when, how many, the plan and the WhatsApp group. */
export default function TripEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return id ? <EditExisting id={id} /> : <TripForm />;
}

/** Editing: load the trip as it is, then open the form filled with it. */
function EditExisting({ id }: { id: string }) {
  const { t } = useI18n();
  const { state, reload } = useCommunity<{ trip: Trip; members: TripMember[] }>('trip', { id });
  if (state.status === 'ready') return <TripForm initial={state.data.trip} />;
  return (
    <Screen back title={t.community.tripEdit.titleEdit}>
      {state.status === 'loading' ? (
        <LoadingState label={t.common.loading} />
      ) : (
        <RetryCard message={t.community.errors.load} retryLabel={t.common.retry} onRetry={reload} />
      )}
    </Screen>
  );
}

function TripForm({ initial }: { initial?: Trip }) {
  const { t, lang } = useI18n();
  const c = t.community;
  const te = c.tripEdit;
  const toast = useToast();
  const act = useCommunityActions();
  const id = initial?.id;

  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [destinationId, setDestinationId] = useState<string | null>(initial?.destinationId ?? null);
  const [start, setStart] = useState<string | undefined>(initial?.startsOn);
  const [length, setLength] = useState(initial ? tripLength(initial.startsOn, initial.endsOn) : 2);
  const [seats, setSeats] = useState<number | null>(initial?.seats ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = bhToday();
    const list = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
    return start && !list.includes(start) ? [start, ...list] : list;
  }, [start]);
  const lengths = LENGTHS.includes(length) ? LENGTHS : [...LENGTHS, length].sort((a, b) => a - b);

  async function save() {
    if (!start) return;
    if (hasLink(destination) || hasLink(description)) return setError(t.common.noLinks);
    setSaving(true);
    setError(null);
    try {
      const r = await act.saveTrip({
        id,
        destination: destination.trim(),
        destinationId,
        startsOn: start,
        endsOn: addDays(start, length - 1),
        seats,
        description: description.trim() || null,
      });
      if (r.status === 'hidden') {
        setError([c.wall.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
        setSaving(false);
        return;
      }
      toast(r.status === 'published' ? te.saved : c.compose.pending);
      if (id) router.back();
      else router.replace(`/community/trips/${r.id}` as Href);
    } catch (e) {
      if (errorCode(e) === 'terms') {
        router.replace({ pathname: '/community/charter', params: { next: '/community/trips/edit' } });
        return;
      }
      setError(communityError(e, t));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={id ? te.titleEdit : te.titleNew}>
        <Card style={{ gap: Spacing.lg }}>
          <Input
            label={te.destination}
            value={destination}
            onChangeText={(v) => {
              setDestination(v);
              setDestinationId(null);
            }}
            placeholder={te.destinationPlaceholder}
            maxLength={80}
          />
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{te.suggestions}</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.scroller}>
              {destinations.map((d) => (
                <Chip
                  key={d.id}
                  label={d.name}
                  selected={d.id === destinationId}
                  onPress={() => {
                    setDestination(d.name);
                    setDestinationId(d.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{te.start}</FieldLabel>
            <DateChips dates={dates} value={start} onChange={setStart} />
          </View>
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{te.duration}</FieldLabel>
            <ChipWrap>
              {lengths.map((n) => (
                <Chip key={n} label={te.days(n)} selected={n === length} onPress={() => setLength(n)} />
              ))}
            </ChipWrap>
          </View>
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{te.seats}</FieldLabel>
            <ChipWrap>
              {SEATS.map((n) => (
                <Chip
                  key={n ?? 'any'}
                  label={n === null ? te.seatsAny : String(n)}
                  selected={n === seats}
                  onPress={() => setSeats(n)}
                />
              ))}
            </ChipWrap>
          </View>
          <Input
            label={te.description}
            value={description}
            onChangeText={setDescription}
            placeholder={te.descriptionPlaceholder}
            multiline
            maxLength={600}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Notice icon="shield" text={c.compose.aiNote} />
          {error && <InlineMessage kind="error" text={error} />}
          <Button
            label={id ? te.saveEdit : te.save}
            onPress={save}
            loading={saving}
            disabled={destination.trim().length < 2 || !start}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.md },
  scroller: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
});
