import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Notice, stampLabel } from '@/components/request-ui';
import { AppText, Avatar, Card, InlineMessage, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { initialsOf, tripDates, type Author, type ChezEvent, type Comment, type Post, type Trip } from '@/lib/community';
import { formatTime } from '@/lib/format';

const BH_OFFSET_MS = 3 * 3_600_000;
/** BH wall-clock parts of an instant: { date: YYYY-MM-DD, time: HH:MM }. */
export function bhParts(at: string) {
  const local = new Date(Date.parse(at) - BH_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Why the student's own post isn't up yet: held for the team, or not published with the AI's reason. */
export function ContentStatusNote({ item }: { item: Pick<Post, 'status' | 'reason'> }) {
  const { t, lang } = useI18n();
  if (item.status === 'published') return null;
  if (item.status === 'pending') return <Notice icon="clock" text={t.community.wall.pending} />;
  return (
    <InlineMessage
      kind="error"
      text={[t.community.wall.notPublished, item.reason?.[lang]].filter(Boolean).join(' · ')}
    />
  );
}

/** Avatar, name, when (and what kind of post). */
export function AuthorLine({ author, at, extra }: { author: Author; at: string; extra?: string }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <View style={styles.author}>
      <Avatar initials={initialsOf(author.name)} size={36} />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{author.me ? t.common.you : author.name}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {[stampLabel(at, lang), extra].filter(Boolean).join(' · ')}
        </AppText>
      </View>
    </View>
  );
}

/** A post on the wall; the whole card opens it (comments, report, block). */
export function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const w = t.community.wall;
  const kind = post.kind === 'post' ? undefined : w.kinds[post.kind];
  const scope = post.scope === 'apartment' ? w.scopeApartment : undefined;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      <Card style={{ gap: Spacing.sm }}>
        <AuthorLine author={post.author} at={post.createdAt} extra={[kind, scope].filter(Boolean).join(' · ')} />
        <AppText>{post.body}</AppText>
        <ContentStatusNote item={post} />
        {post.status === 'published' && (
          <View style={styles.footer}>
            <Icon name="feedback" size={16} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary}>
              {w.comments(post.comments)}
            </AppText>
          </View>
        )}
      </Card>
    </PressableScale>
  );
}

export function CommentRow({ comment, onOptions }: { comment: Comment; onOptions?: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: Spacing.xs }}>
      <View style={styles.commentHead}>
        <View style={{ flex: 1 }}>
          <AuthorLine author={comment.author} at={comment.createdAt} />
        </View>
        {onOptions && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t.community.post.options}
            onPress={onOptions}
            hitSlop={10}
            style={styles.more}>
            <Icon name="chevronDown" size={18} color={theme.textTertiary} />
          </PressableScale>
        )}
      </View>
      <AppText style={{ paddingLeft: 36 + Spacing.sm }}>{comment.body}</AppText>
      {comment.status !== 'published' && (
        <View style={{ paddingLeft: 36 + Spacing.sm }}>
          <ContentStatusNote item={comment} />
        </View>
      )}
    </View>
  );
}

/** Day number and short month, like a calendar page. */
function DateBlock({ at }: { at: string }) {
  const theme = useTheme();
  const { lang } = useI18n();
  const { date } = bhParts(at);
  const [y, m, d] = date.split('-').map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });
  return (
    <View style={[styles.dateBlock, { backgroundColor: theme.fill }]}>
      <AppText variant="title">{d}</AppText>
      <AppText variant="caption" color={theme.textSecondary}>
        {month.replace('.', '')}
      </AppText>
    </View>
  );
}

export function EventCard({ event, onPress }: { event: ChezEvent; onPress: () => void }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const e = t.community.events;
  const { time } = bhParts(event.startsAt);
  const status = event.cancelled
    ? e.cancelled
    : event.myRsvp === 'going'
      ? e.myGoing
      : event.full
        ? e.full
        : event.capacity
          ? e.goingOf(event.goingCount, event.capacity)
          : e.going(event.goingCount);
  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      <Card style={styles.eventCard}>
        <DateBlock at={event.startsAt} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{event.title[lang] || event.title.fr}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {formatTime(time, lang)} · {event.venue}
          </AppText>
          <AppText
            variant="caption"
            color={event.cancelled ? theme.error : event.myRsvp === 'going' ? theme.success : theme.textSecondary}>
            {status}
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={theme.textTertiary} />
      </Card>
    </PressableScale>
  );
}

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const tr = t.community.trips;
  const status =
    trip.status === 'cancelled'
      ? tr.cancelled
      : trip.status === 'pending'
        ? tr.pending
        : trip.joined
          ? tr.joined
          : trip.full
            ? tr.full
            : tr.members(trip.membersCount, trip.seats);
  const statusColor =
    trip.status === 'cancelled' || trip.status === 'hidden'
      ? theme.error
      : trip.joined && trip.status === 'published'
        ? theme.success
        : theme.textSecondary;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      <Card style={styles.eventCard}>
        <View style={[styles.tripIcon, { backgroundColor: theme.fill }]}>
          <Icon name="travel" size={20} color={theme.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{trip.destination}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {tripDates(trip.startsOn, trip.endsOn, lang)} · {trip.creator.me ? t.common.you : trip.creator.name}
          </AppText>
          <AppText variant="caption" color={statusColor}>
            {trip.status === 'hidden' ? t.community.wall.notPublished : status}
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={theme.textTertiary} />
      </Card>
    </PressableScale>
  );
}

/** Explorer › Voyages: the way into group trips with other residents (owner, 2026-11-08). */
export function GroupTripsEntry() {
  const { t } = useI18n();
  return (
    <Card style={{ paddingVertical: 0 }}>
      <ListGroup inset>
        <ListRow
          icon="people"
          title={t.community.trips.banner}
          subtitle={t.community.trips.bannerBody}
          onPress={() => router.push('/community/trips')}
        />
      </ListGroup>
    </Card>
  );
}

const styles = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  more: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dateBlock: { width: 52, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  tripIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
