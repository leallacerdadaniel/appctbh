import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { CommentRow, ContentStatusNote } from '@/components/community-ui';
import { ListGroup, ListRow } from '@/components/list';
import { Notice } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  errorCode,
  initialsOf,
  tripDates,
  useCommunity,
  useCommunityActions,
  type Comment,
  type TripDetail,
} from '@/lib/community';
import { hasLink } from '@/lib/no-links';
import { getDestination } from '@/lib/travel';
import { openWhatsApp } from '@/lib/whatsapp';

/**
 * A group trip: the plan, who is going, join or leave, the group chat (only for the people going, moderated like the
 * wall; no WhatsApp group link: owner, 2026-11-09, "se for malicioso nos complicamos"), and a line to ask Chez Toi
 * for transport or accommodation.
 */
export default function TripScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community;
  const tr = c.trips;
  const toast = useToast();
  const act = useCommunityActions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useCommunity<TripDetail>('trip', { id });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [talkError, setTalkError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError(communityError(e, t));
    } finally {
      setBusy(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen back title={tr.title}>
        <LoadingState label={t.common.loading} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen back title={tr.title}>
        {state.code === 'notFound' ? (
          <InlineMessage kind="error" text={c.errors.notFound} />
        ) : (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />
        )}
      </Screen>
    );
  }

  const { trip, members, canTalk, comments } = state.data;
  const dates = tripDates(trip.startsOn, trip.endsOn, lang);
  const guide = trip.destinationId ? getDestination(trip.destinationId) : undefined;
  const mine = trip.creator.me;
  const open = trip.status === 'published';

  function block(author: { id: string; name: string }, leave: boolean) {
    Alert.alert(c.post.blockConfirmTitle(author.name), c.post.blockConfirmBody, [
      { text: c.post.cancel, style: 'cancel' },
      {
        text: c.post.block(author.name),
        style: 'destructive',
        onPress: async () => {
          try {
            await act.block(author.id);
            toast(c.post.blocked);
            if (leave) router.back();
            else reload();
          } catch (e) {
            setError(communityError(e, t));
          }
        },
      },
    ]);
  }

  /** Mine: delete. Someone else's: report or block (two actions + cancel fit Android's alert). */
  function options(type: 'trip' | 'comment', targetId: string, author: { id: string; name: string; me: boolean }) {
    if (author.me) {
      Alert.alert(c.post.deleteCommentConfirm, undefined, [
        { text: c.post.cancel, style: 'cancel' },
        { text: c.post.delete, style: 'destructive', onPress: () => run(() => act.deleteComment(targetId)) },
      ]);
      return;
    }
    Alert.alert(c.post.options, undefined, [
      { text: c.post.report, onPress: () => router.push({ pathname: '/community/report', params: { type, id: targetId } }) },
      { text: c.post.block(author.name), style: 'destructive', onPress: () => block(author, type === 'trip') },
      { text: c.post.cancel, style: 'cancel' },
    ]);
  }

  function cancel() {
    Alert.alert(tr.cancelConfirm, undefined, [
      { text: c.post.cancel, style: 'cancel' },
      { text: tr.cancel, style: 'destructive', onPress: () => run(() => act.cancelTrip(trip.id)) },
    ]);
  }

  async function send() {
    setTalkError(null);
    if (hasLink(message)) return setTalkError(t.common.noLinks);
    setSending(true);
    try {
      const r = await act.saveTripComment(trip.id, message.trim());
      if (r.status === 'hidden') {
        setTalkError([c.wall.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
      } else {
        setMessage('');
        if (r.status === 'pending') toast(c.post.commentPending);
        await reload();
      }
    } catch (e) {
      // First message: the guidelines come first, then back here with the text still typed.
      if (errorCode(e) === 'terms') router.push({ pathname: '/community/charter', params: { next: 'back' } });
      else setTalkError(communityError(e, t));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen back title={trip.destination} subtitle={dates} onRefresh={reload}>
      {trip.status === 'cancelled' && <InlineMessage kind="error" text={tr.cancelled} />}
      {mine && (
        <ContentStatusNote
          item={{ status: trip.status === 'cancelled' ? 'published' : trip.status, reason: trip.reason }}
        />
      )}

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {tr.organizer(mine ? t.common.you : trip.creator.name)} · {tr.members(trip.membersCount, trip.seats)}
        </AppText>
        {trip.description ? (
          <>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{tr.program}</AppText>
            <AppText>{trip.description}</AppText>
          </>
        ) : null}
      </Card>

      {open && !mine && (
        <Button
          label={trip.joined ? tr.leave : trip.full ? tr.full : tr.join}
          variant={trip.joined ? 'secondary' : 'primary'}
          onPress={() => run(() => (trip.joined ? act.leaveTrip(trip.id) : act.joinTrip(trip.id)))}
          loading={busy}
          disabled={!trip.joined && trip.full}
        />
      )}
      {error && <InlineMessage kind="error" text={error} />}

      <Section title={tr.who}>
        <Card style={{ gap: Spacing.md }}>
          {members.map((m) => (
            <View key={m.id} style={styles.member}>
              <Avatar initials={initialsOf(m.name)} size={32} />
              <AppText style={{ flex: 1 }}>{m.me ? t.common.you : m.name}</AppText>
            </View>
          ))}
        </Card>
      </Section>

      {open && (
        <Section title={tr.talk} subtitle={tr.talkHint}>
          {canTalk ? (
            <>
              <Card style={{ gap: Spacing.lg }}>
                {comments.length === 0 && <AppText color={theme.textSecondary}>{tr.talkEmpty}</AppText>}
                {comments.map((cm: Comment) => (
                  <CommentRow key={cm.id} comment={cm} onOptions={() => options('comment', cm.id, cm.author)} />
                ))}
              </Card>
              <Card style={{ gap: Spacing.md }}>
                <Input
                  label={c.post.comment}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={tr.talkPlaceholder}
                  multiline
                  maxLength={500}
                  style={{ minHeight: 64, textAlignVertical: 'top' }}
                />
                {talkError && <InlineMessage kind="error" text={talkError} />}
                <Button label={tr.talkSend} onPress={send} loading={sending} disabled={!message.trim()} />
              </Card>
            </>
          ) : (
            <Notice icon="people" text={tr.talkJoin} />
          )}
        </Section>
      )}

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {guide && (
            <ListRow
              icon="travel"
              title={tr.guide}
              subtitle={guide.name}
              onPress={() => router.push(`/travel/${guide.id}` as Href)}
            />
          )}
          {open && (trip.joined || mine) && (
            <ListRow
              icon="whatsapp"
              title={tr.help}
              onPress={() => openWhatsApp('group_trip', tr.helpMessage(trip.destination, dates))}
            />
          )}
          {mine && trip.status !== 'cancelled' && (
            <ListRow
              icon="edit"
              title={tr.edit}
              onPress={() => router.push({ pathname: '/community/trips/edit', params: { id: trip.id } })}
            />
          )}
          {mine && trip.status !== 'cancelled' && <ListRow icon="close" title={tr.cancel} onPress={cancel} />}
          {!mine && (
            <ListRow
              icon="warning"
              title={c.post.options}
              subtitle={c.post.report}
              onPress={() => options('trip', trip.id, trip.creator)}
            />
          )}
        </ListGroup>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
