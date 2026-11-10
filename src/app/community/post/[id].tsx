import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AuthorLine, CommentRow, ContentStatusNote } from '@/components/community-ui';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input, LoadingState, PressableScale, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  errorCode,
  replaceRefused,
  useCommunity,
  useCommunityActions,
  type Author,
  type Comment,
  type Post,
  type ReportTarget,
} from '@/lib/community';
import { hasLink } from '@/lib/no-links';

/** One post with its comments; report or block someone, delete what is mine. */
export default function PostScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community;
  const toast = useToast();
  const act = useCommunityActions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useCommunity<{ post: Post; comments: Comment[] }>('post', { id });
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The comment the AI refused on the last try: deleted before the corrected text goes out (one try, one comment).
  const [refusedId, setRefusedId] = useState<string | null>(null);

  const report = (type: ReportTarget, targetId: string) =>
    router.push({ pathname: '/community/report', params: { type, id: targetId } });

  function block(author: Author, leave: boolean) {
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

  function remove(kind: 'post' | 'comment', targetId: string) {
    Alert.alert(kind === 'post' ? c.post.deletePostConfirm : c.post.deleteCommentConfirm, undefined, [
      { text: c.post.cancel, style: 'cancel' },
      {
        text: c.post.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            if (kind === 'post') {
              await act.deletePost(targetId);
              router.back();
            } else {
              await act.deleteComment(targetId);
              reload();
            }
          } catch (e) {
            setError(communityError(e, t));
          }
        },
      },
    ]);
  }

  /** Mine: delete. Someone else's: report or block (two actions + cancel fit Android's alert). */
  function options(kind: ReportTarget, targetId: string, author: Author) {
    if (author.me) return remove(kind === 'post' ? 'post' : 'comment', targetId);
    Alert.alert(c.post.options, undefined, [
      { text: c.post.report, onPress: () => report(kind, targetId) },
      { text: c.post.block(author.name), style: 'destructive', onPress: () => block(author, kind === 'post') },
      { text: c.post.cancel, style: 'cancel' },
    ]);
  }

  async function send() {
    setError(null);
    if (hasLink(comment)) return setError(t.common.noLinks);
    setSending(true);
    try {
      await replaceRefused(refusedId, act.deleteComment);
      setRefusedId(null);
      const r = await act.saveComment(id, comment.trim());
      if (r.status === 'hidden') {
        setRefusedId(r.id);
        setError([c.wall.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
      } else {
        setComment('');
        if (r.status === 'pending') toast(c.post.commentPending);
        await reload();
      }
    } catch (e) {
      // First comment: the guidelines come first, then back here with the text still typed.
      if (errorCode(e) === 'terms') {
        router.push({ pathname: '/community/charter', params: { next: 'back' } });
      } else {
        setError(communityError(e, t));
      }
    } finally {
      setSending(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen back title={c.post.title}>
        <LoadingState label={t.common.loading} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen back title={c.post.title}>
        {state.code === 'notFound' ? (
          <InlineMessage kind="error" text={c.errors.notFound} />
        ) : (
          <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />
        )}
      </Screen>
    );
  }

  const { post, comments } = state.data;
  const kind = post.kind === 'post' ? undefined : c.wall.kinds[post.kind];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={c.post.title} onRefresh={reload}>
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <AuthorLine author={post.author} at={post.createdAt} extra={kind} />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={post.author.me ? c.post.delete : c.post.options}
              onPress={() => options('post', post.id, post.author)}
              hitSlop={10}
              style={styles.more}>
              <Icon name={post.author.me ? 'trash' : 'warning'} size={18} color={theme.textTertiary} />
            </PressableScale>
          </View>
          <AppText>{post.body}</AppText>
          <ContentStatusNote item={post} />
        </Card>

        <Card style={{ gap: Spacing.lg }}>
          {comments.length === 0 && <AppText color={theme.textSecondary}>{c.post.noComments}</AppText>}
          {comments.map((cm) => (
            <CommentRow key={cm.id} comment={cm} onOptions={() => options('comment', cm.id, cm.author)} />
          ))}
        </Card>

        {post.status === 'published' && (
          <Card style={{ gap: Spacing.md }}>
            <Input
              label={c.post.comment}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
            {error && <InlineMessage kind="error" text={error} />}
            <Button label={c.post.send} onPress={send} loading={sending} disabled={!comment.trim()} />
          </Card>
        )}
        {post.status !== 'published' && error && <InlineMessage kind="error" text={error} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
