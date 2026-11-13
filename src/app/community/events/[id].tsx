import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { bhParts } from '@/components/community-ui';
import { ListGroup, ListRow } from '@/components/list';
import { dayLabel } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Avatar, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { communityError, initialsOf, useCommunity, useCommunityActions, type ChezEvent } from '@/lib/community';
import { formatTime } from '@/lib/format';

/** A Chez Toi event (created in the panel): when, where, who is coming, and the student's answer. */
export default function EventScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community;
  const e = c.events;
  const act = useCommunityActions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useCommunity<{ event: ChezEvent; attendees: { id: string; name: string; me: boolean }[] }>(
    'event',
    { id },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(going: boolean) {
    setBusy(true);
    setError(null);
    try {
      await act.rsvp(id, going);
      await reload();
    } catch (err) {
      setError(communityError(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (state.status !== 'ready') {
    return (
      <Screen back title={e.title}>
        {state.status === 'loading' ? (
          <LoadingState label={t.common.loading} />
        ) : state.code === 'notFound' ? (
          <InlineMessage kind="error" text={c.errors.notFound} />
        ) : (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />
        )}
      </Screen>
    );
  }

  const { event, attendees } = state.data;
  const start = bhParts(event.startsAt);
  const end = event.endsAt ? bhParts(event.endsAt) : null;
  const when = `${dayLabel(start.date, lang)} · ${formatTime(start.time, lang)}${
    end ? ` – ${end.date === start.date ? '' : `${dayLabel(end.date, lang)} `}${formatTime(end.time, lang)}` : ''
  }`;
  const description = event.description[lang] || event.description.fr || event.description.en;
  const place = [event.venue, event.address].filter(Boolean).join(', ');

  return (
    <Screen back title={event.title[lang] || event.title.fr} onRefresh={reload}>
      {event.photoUrl && (
        <Image source={{ uri: event.photoUrl }} style={[styles.photo, { backgroundColor: theme.fill }]} contentFit="cover" />
      )}
      {event.cancelled && <InlineMessage kind="error" text={e.cancelled} />}

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow icon="calendar" title={e.when} subtitle={when} />
          <ListRow
            icon="address"
            title={e.where}
            subtitle={place}
            value={e.openMaps}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: place })}`)
            }
          />
        </ListGroup>
      </Card>

      {description ? (
        <Card>
          <AppText>{description}</AppText>
        </Card>
      ) : null}

      {!event.cancelled && (
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="callout" color={theme.textSecondary}>
            {event.capacity ? e.goingOf(event.goingCount, event.capacity) : e.going(event.goingCount)}
          </AppText>
          <Button
            label={event.myRsvp === 'going' ? `✓ ${e.myGoing}` : event.full ? e.full : e.join}
            variant={event.myRsvp === 'going' ? 'secondary' : 'primary'}
            onPress={() => answer(true)}
            loading={busy}
            disabled={event.myRsvp === 'going' || event.full}
          />
          <Button
            label={event.myRsvp === 'notGoing' ? `✓ ${e.myNotGoing}` : e.decline}
            variant="plain"
            onPress={() => answer(false)}
            disabled={busy || event.myRsvp === 'notGoing'}
          />
          {error && <InlineMessage kind="error" text={error} />}
        </View>
      )}

      <Section title={e.attendees}>
        <Card style={{ gap: Spacing.md }}>
          {attendees.length === 0 && <AppText color={theme.textSecondary}>{e.noAttendees}</AppText>}
          {attendees.map((a) => (
            <View key={a.id} style={styles.person}>
              <Avatar initials={initialsOf(a.name)} size={32} />
              <AppText style={{ flex: 1 }}>{a.me ? t.common.you : a.name}</AppText>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
