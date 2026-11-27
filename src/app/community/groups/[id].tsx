import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ContentStatusNote, PostCard } from '@/components/community-ui';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Notice } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  initialsOf,
  useCommunity,
  useCommunityActions,
  type CommunityStatus,
  type GroupDetail,
  type Post,
} from '@/lib/community';

/**
 * A residents' group (2026-11-27, owner: "comunidade ou é pra todos, ou pra grupos que ele deveria poder criar"):
 * what it is about, its posts (only for members), who is in, join or leave in the bar pinned at the bottom (like the
 * group trips). The creator edits or deletes it; the others can report it or block its creator.
 */
export default function GroupScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const c = t.community;
  const g = c.groups;
  const toast = useToast();
  const act = useCommunityActions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useCommunity<GroupDetail>('group', { id });
  const status = useCommunity<CommunityStatus>('status');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Screen back title={g.title}>
        <LoadingState label={t.common.loading} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen back title={g.title}>
        {state.code === 'notFound' ? (
          <InlineMessage kind="error" text={c.errors.notFound} />
        ) : (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />
        )}
      </Screen>
    );
  }

  const { group, members, canPost } = state.data;
  const mine = !!group.creator?.me;
  const open = group.status === 'published';
  const me = status.state.status === 'ready' ? status.state.data : null;
  const suspended = !!me?.suspendedUntil;

  function write() {
    const next = `/community/post-new?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`;
    if (me && !me.termsAccepted) router.push({ pathname: '/community/charter', params: { next } });
    else router.push(next as Href);
  }

  function archive() {
    Alert.alert(g.archiveConfirm, undefined, [
      { text: c.post.cancel, style: 'cancel' },
      {
        text: g.archive,
        style: 'destructive',
        onPress: async () => {
          try {
            await act.archiveGroup(group.id);
            toast(g.archived);
            router.back();
          } catch (e) {
            setError(communityError(e, t));
          }
        },
      },
    ]);
  }

  /** Someone else's group: report it, or block its creator (two actions + cancel fit Android's alert). */
  function options() {
    const creator = group.creator;
    Alert.alert(c.post.options, undefined, [
      { text: c.post.report, onPress: () => router.push({ pathname: '/community/report', params: { type: 'group', id: group.id } }) },
      ...(creator
        ? [
            {
              text: c.post.block(creator.name),
              style: 'destructive' as const,
              onPress: () =>
                Alert.alert(c.post.blockConfirmTitle(creator.name), c.post.blockConfirmBody, [
                  { text: c.post.cancel, style: 'cancel' },
                  {
                    text: c.post.block(creator.name),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await act.block(creator.id);
                        toast(c.post.blocked);
                        router.back();
                      } catch (e) {
                        setError(communityError(e, t));
                      }
                    },
                  },
                ]),
            },
          ]
        : []),
      { text: c.post.cancel, style: 'cancel' },
    ]);
  }

  // The creator doesn't leave (they delete the group); nothing to answer on a group that isn't up.
  const canAnswer = open && !mine;
  const by = group.creator ? g.createdBy(mine ? t.common.you : group.creator.name) : g.noCreator;

  return (
    <Screen
      back
      title={group.name}
      subtitle={g.members(group.membersCount)}
      onRefresh={() => Promise.all([reload(), status.reload()])}
      footer={
        canAnswer ? (
          <>
            {error && <InlineMessage kind="error" text={error} />}
            {group.joined ? (
              <View style={styles.joined}>
                <View style={styles.joinedLabel}>
                  <Icon name="checkCircleFill" size={20} color={theme.success} />
                  <AppText color={theme.success} style={{ fontFamily: Fonts.bodySemi, flexShrink: 1 }}>
                    {g.joined}
                  </AppText>
                </View>
                <Button label={g.leave} variant="secondary" onPress={() => run(() => act.leaveGroup(group.id))} loading={busy} />
              </View>
            ) : (
              <Button label={g.join} onPress={() => run(() => act.joinGroup(group.id))} loading={busy} />
            )}
          </>
        ) : undefined
      }>
      {mine && <ContentStatusNote item={group} />}

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {by}
        </AppText>
        {group.description ? <AppText>{group.description}</AppText> : null}
      </Card>

      {/* With the pinned bar, the error shows right above its button. */}
      {error && !canAnswer && <InlineMessage kind="error" text={error} />}

      {open && (
        <Section title={g.posts} subtitle={g.postsHint}>
          {canPost ? (
            <>
              <Button label={g.write} onPress={write} disabled={suspended} />
              <GroupPosts groupId={group.id} />
            </>
          ) : (
            <Notice icon="people" text={g.joinToRead} />
          )}
        </Section>
      )}

      <Section title={g.who}>
        <Card style={{ gap: Spacing.md }}>
          {members.map((m) => (
            <View key={m.id} style={styles.member}>
              <Avatar initials={initialsOf(m.name)} size={32} />
              <AppText style={{ flex: 1 }}>{m.me ? t.common.you : m.name}</AppText>
            </View>
          ))}
        </Card>
      </Section>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {mine && (
            <ListRow
              icon="edit"
              title={g.edit}
              onPress={() => router.push({ pathname: '/community/groups/edit', params: { id: group.id } } as unknown as Href)}
            />
          )}
          {mine && <ListRow icon="close" title={g.archive} onPress={archive} />}
          {!mine && <ListRow icon="warning" title={c.post.options} subtitle={c.post.report} onPress={options} />}
        </ListGroup>
      </Card>
    </Screen>
  );
}

/** The group's posts, only loaded for members (the server refuses the others). */
function GroupPosts({ groupId }: { groupId: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  const c = t.community;
  const feed = useCommunity<{ posts: Post[] }>('feed', { groupId });
  if (feed.state.status === 'loading') return <LoadingState label={t.common.loading} />;
  if (feed.state.status === 'error') {
    return <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={feed.reload} />;
  }
  if (feed.state.data.posts.length === 0) {
    return (
      <Card>
        <AppText color={theme.textSecondary}>{c.groups.postsEmpty}</AppText>
      </Card>
    );
  }
  return (
    <>
      {feed.state.data.posts.map((p) => (
        <PostCard key={p.id} post={p} onPress={() => router.push(`/community/post/${p.id}` as Href)} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  // Wraps under the label with large text or a long translation: nothing is cut.
  joined: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md },
  joinedLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexGrow: 1, flexShrink: 1 },
});
