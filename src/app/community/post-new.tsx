import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { ChipWrap, FieldLabel, Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { communityError, errorCode, useCommunityActions, type PostKind, type Scope } from '@/lib/community';
import { hasLink } from '@/lib/no-links';

const KINDS: PostKind[] = ['post', 'question', 'giveaway'];
const MAX = 1000;

/** Write on the wall. The AI checks it first: published, held for the team, or not published with the reason. */
export default function NewPostScreen() {
  const { t, lang } = useI18n();
  const c = t.community;
  const toast = useToast();
  const act = useCommunityActions();
  const params = useLocalSearchParams<{ scope?: string }>();
  const [scope, setScope] = useState<Scope>(params.scope === 'apartment' ? 'apartment' : 'all');
  const [kind, setKind] = useState<PostKind>('post');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (hasLink(body)) return setError(t.common.noLinks);
    setSending(true);
    try {
      const r = await act.savePost({ scope, kind, body: body.trim() });
      if (r.status === 'hidden') {
        // Not published: keep the text so the student can change it and try again.
        setError([c.compose.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
        setSending(false);
        return;
      }
      toast(r.status === 'published' ? c.compose.published : c.compose.pending);
      router.back();
    } catch (e) {
      if (errorCode(e) === 'terms') {
        router.replace({ pathname: '/community/charter', params: { next: `/community/post-new?scope=${scope}` } });
        return;
      }
      setError(communityError(e, t));
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={c.compose.title}>
        <Card style={{ gap: Spacing.lg }}>
          <View style={{ gap: Spacing.sm }}>
            <FieldLabel>{c.compose.who}</FieldLabel>
            <SegmentedControl
              options={[
                { value: 'all', label: c.compose.scopeAll },
                { value: 'apartment', label: c.compose.scopeApartment },
              ]}
              value={scope}
              onChange={setScope}
            />
          </View>
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
