import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EventCard, GroupCard, PostCard, TripCard } from '@/components/community-ui';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  useCommunity,
  type ChezEvent,
  type CommunityStatus,
  type Group,
  type Post,
  type Trip,
} from '@/lib/community';
import { bhDateTime } from '@/lib/bh-time';
import { formatDate } from '@/lib/format';

const TRIPS_ON_HUB = 3;
const GROUPS_ON_HUB = 3;

/**
 * "Communauté" (wave 15, owner 2026-11-09): Chez Toi events, group trips, the residents' groups and the wall, with
 * the guidelines and blocked people at the end. Writing asks for the guidelines once (store requirement).
 * 2026-11-27 (owner): the wall is for every resident; "Mon appart" gave way to groups residents create.
 */
export default function CommunityScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community;
  const status = useCommunity<CommunityStatus>('status');
  const events = useCommunity<{ events: ChezEvent[] }>('events');
  const trips = useCommunity<{ trips: Trip[] }>('trips');
  const groups = useCommunity<{ groups: Group[] }>('groups');
  const feed = useCommunity<{ posts: Post[] }>('feed');

  const me = status.state.status === 'ready' ? status.state.data : null;
  const suspended = !!me?.suspendedUntil;
  const eventList = events.state.status === 'ready' ? events.state.data.events : [];
  const tripList = trips.state.status === 'ready' ? trips.state.data.trips : [];
  const groupList = groups.state.status === 'ready' ? groups.state.data.groups : [];

  /** Writing needs the guidelines accepted: show them first, then come back to what the student wanted. */
  function needsCharter(next: string) {
    if (me && !me.termsAccepted) {
      router.push({ pathname: '/community/charter', params: { next } });
      return true;
    }
    return false;
  }
  const write = () => {
    const next = '/community/post-new';
    if (!needsCharter(next)) router.push(next as Href);
  };
  const proposeTrip = () => {
    if (!needsCharter('/community/trips/edit')) router.push('/community/trips/edit');
  };
  const createGroup = () => {
    if (!needsCharter('/community/groups/edit')) router.push('/community/groups/edit' as Href);
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
      onRefresh={() => Promise.all([status.reload(), events.reload(), trips.reload(), groups.reload(), feed.reload()])}>
      {me?.suspendedUntil && (
        // The day the suspension ends in Belo Horizonte (the UTC day of the timestamp is tomorrow at night).
        <InlineMessage
          kind="error"
          text={c.suspended(formatDate(bhDateTime(me.suspendedUntil)?.date ?? me.suspendedUntil.slice(0, 10), lang))}
        />
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

      {/* Groups before the wall: the wall can be long, the groups would sink under it. */}
      <Section
        title={c.groups.title}
        subtitle={c.groups.subtitle}
        action={groupList.length > GROUPS_ON_HUB ? c.groups.seeAll : undefined}
        onAction={() => router.push('/community/groups' as Href)}>
        {groupList.slice(0, GROUPS_ON_HUB).map((g) => (
          <GroupCard key={g.id} group={g} onPress={() => router.push(`/community/groups/${g.id}` as Href)} />
        ))}
        {groups.state.status === 'ready' && groupList.length === 0 && (
          <Card>
            <AppText color={theme.textSecondary}>{c.groups.empty}</AppText>
          </Card>
        )}
        {groups.state.status === 'error' && (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={groups.reload} />
        )}
        <Button label={c.groups.create} variant="secondary" onPress={createGroup} disabled={suspended} />
      </Section>

      <Section title={c.wall.title} subtitle={c.wall.subtitle}>
        <Button label={c.wall.write} onPress={write} disabled={suspended} />
        {feed.state.status === 'loading' && <LoadingState label={t.common.loading} />}
        {feed.state.status === 'error' && (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={feed.reload} />
        )}
        {feed.state.status === 'ready' &&
          (feed.state.data.posts.length === 0 ? (
            <Card>
              <AppText color={theme.textSecondary}>{c.wall.empty}</AppText>
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
