import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { ChipWrap, FieldLabel, Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  errorCode,
  replaceRefused,
  useCommunityActions,
  type PostKind,
} from '@/lib/community';
import { hasLink } from '@/lib/no-links';
import { textParam } from '@/lib/params';

const KINDS: PostKind[] = ['post', 'question', 'giveaway'];
const MAX = 1000;

/**
 * Write on the wall (every resident) or in a group the student joined (`groupId`, with its name to say where it
 * goes). "Mes colocataires" left on 2026-11-27 (owner). The AI checks it first: published, held for the team, or not published with the reason.
 * A refused post is already stored (its author sees it, with the reason): sending the corrected text deletes it
 * first, so one attempt stays one post (review, 2026-11-10).
 */
export default function NewPostScreen() {
  const { t, lang } = useI18n();
  const c = t.community;
  const toast = useToast();
  const act = useCommunityActions();
  const params = useLocalSearchParams<{ groupId?: string; groupName?: string }>();
  const groupId = textParam(params.groupId) || undefined;
  const groupName = textParam(params.groupName);
  const [kind, setKind] = useState<PostKind>('post');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The post the AI refused on the last try, deleted before the corrected text goes out.
  const [refusedId, setRefusedId] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (hasLink(body)) return setError(t.common.noLinks);
    setSending(true);
    try {
      await replaceRefused(refusedId, act.deletePost);
      setRefusedId(null);
      const r = await act.savePost({ groupId, kind, body: body.trim() });
      if (r.status === 'hidden') {
        // Not published: keep the text so the student can change it and try again.
        setRefusedId(r.id);
        setError([c.compose.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
        setSending(false);
        return;
      }
      toast(r.status === 'published' ? c.compose.published : c.compose.pending);
      router.back();
    } catch (e) {
      setSending(false);
      // First post: the guidelines come first, then back here with the text still typed.
      if (errorCode(e) === 'terms') {
        router.push({ pathname: '/community/charter', params: { next: 'back' } });
        return;
      }
      setError(communityError(e, t));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={c.compose.title}>
        <Card style={{ gap: Spacing.lg }}>
          <Notice icon="people" text={groupId ? c.compose.toGroup(groupName) : c.compose.toAll} />
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{c.compose.kind}</FieldLabel>
            <ChipWrap>
              {KINDS.map((k) => (
                <Chip key={k} label={c.wall.kinds[k]} selected={k === kind} onPress={() => setKind(k)} />
              ))}
            </ChipWrap>
          </View>
          <Input
            label={c.compose.body}
            value={body}
            onChangeText={setBody}
            placeholder={c.compose.placeholder}
            multiline
            maxLength={MAX}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <Notice icon="shield" text={c.compose.aiNote} />
          {error && <InlineMessage kind="error" text={error} />}
          <Button label={c.compose.send} onPress={send} loading={sending} disabled={!body.trim()} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
