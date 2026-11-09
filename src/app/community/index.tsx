import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { EventCard, PostCard, TripCard } from '@/components/community-ui';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  useCommunity,
  type ChezEvent,
  type CommunityStatus,
  type Post,
  type Scope,
  type Trip,
} from '@/lib/community';
import { formatDate } from '@/lib/format';

const TRIPS_ON_HUB = 3;

/**
 * "Communauté" (wave 15, owner 2026-11-09): Chez Toi events, group trips and the residents' wall, with the
 * guidelines and blocked people at the end. Writing asks for the guidelines once (store requirement).
 */
export default function CommunityScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community;
  const [scope, setScope] = useState<Scope>('all');
  const status = useCommunity<CommunityStatus>('status');
  const events = useCommunity<{ events: ChezEvent[] }>('events');
  const trips = useCommunity<{ trips: Trip[] }>('trips');
  const feed = useCommunity<{ posts: Post[] }>('feed', { scope });

  const me = status.state.status === 'ready' ? status.state.data : null;
  const suspended = !!me?.suspendedUntil;
  const eventList = events.state.status === 'ready' ? events.state.data.events : [];
  const tripList = trips.state.status === 'ready' ? trips.state.data.trips : [];

  /** Writing needs the guidelines accepted: show them first, then come back to what the student wanted. */
  function needsCharter(next: string) {
    if (me && !me.termsAccepted) {
      router.push({ pathname: '/community/charter', params: { next } });
      return true;
    }
    return false;
  }
  const write = () => {
    const next = `/community/post-new?scope=${scope}`;
    if (!needsCharter(next)) router.push(next as Href);
  };
  const proposeTrip = () => {
    if (!needsCharter('/community/trips/edit')) router.push('/community/trips/edit');
  };

  if (status.state.status === 'error' && status.state.code === 'noRental') {
    return (
      <Screen back title={c.title}>
        <InlineMessage kind="error" text={c.errors.noRental} />
      </Screen>
    );
  }

  return (
    <Screen
      back
      title={c.title}
      subtitle={c.subtitle}
      onRefresh={() => Promise.all([status.reload(), events.reload(), trips.reload(), feed.reload()])}>
      {me?.suspendedUntil && (
        <InlineMessage kind="error" text={c.suspended(formatDate(me.suspendedUntil.slice(0, 10), lang))} />
      )}

      {eventList.length > 0 && (
        <Section title={c.events.title} subtitle={c.events.subtitle}>
          {eventList.map((e) => (
            <EventCard key={e.id} event={e} onPress={() => router.push(`/community/events/${e.id}` as Href)} />
          ))}
        </Section>
      )}

      <Section
        title={c.trips.title}
        subtitle={c.trips.subtitle}
        action={tripList.length > TRIPS_ON_HUB ? c.trips.seeAll : undefined}
        onAction={() => router.push('/community/trips')}>
        {tripList.slice(0, TRIPS_ON_HUB).map((trip) => (
          <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/community/trips/${trip.id}` as Href)} />
        ))}
        {trips.state.status === 'ready' && tripList.length === 0 && (
          <Card>
            <AppText color={theme.textSecondary}>{c.trips.empty}</AppText>
          </Card>
        )}
        <Button label={c.trips.propose} variant="secondary" onPress={proposeTrip} disabled={suspended} />
      </Section>

      <Section title={c.wall.title} subtitle={c.wall.subtitle}>
        <SegmentedControl
          options={[
            { value: 'all', label: c.wall.all },
            { value: 'apartment', label: c.wall.apartment },
          ]}
          value={scope}
          onChange={setScope}
        />
        <Button label={c.wall.write} onPress={write} disabled={suspended} />
        {feed.state.status === 'loading' && <LoadingState label={t.common.loading} />}
        {feed.state.status === 'error' && (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={feed.reload} />
        )}
        {feed.state.status === 'ready' &&
          (feed.state.data.posts.length === 0 ? (
            <Card>
              <AppText color={theme.textSecondary}>
                {scope === 'apartment' ? c.wall.emptyApartment : c.wall.empty}
              </AppText>
            </Card>
          ) : (
            feed.state.data.posts.map((p) => (
              <PostCard key={p.id} post={p} onPress={() => router.push(`/community/post/${p.id}` as Href)} />
            ))
          ))}
      </Section>

      <Card style={styles.listCard}>
        <ListGroup inset>
          <ListRow icon="shield" title={c.charter.row} onPress={() => router.push('/community/charter')} />
          <ListRow icon="lock" title={c.blocked.row} onPress={() => router.push('/community/blocked')} />
        </ListGroup>
      </Card>
      {status.state.status === 'error' && status.state.code !== 'noRental' && (
        <InlineMessage kind="error" text={c.errors.load} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0, marginTop: Spacing.sm },
});
