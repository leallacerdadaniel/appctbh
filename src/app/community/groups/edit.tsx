import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import {
  communityError,
  errorCode,
  useCommunity,
  useCommunityActions,
  type Group,
  type GroupDetail,
} from '@/lib/community';
import { hasLink } from '@/lib/no-links';
import { textParam } from '@/lib/params';

/** Create a residents' group (or edit mine): a name and, if wanted, what it is about. The AI checks both first. */
export default function GroupEditScreen() {
  const id = textParam(useLocalSearchParams<{ id?: string }>().id);
  return id ? <EditExisting id={id} /> : <GroupForm />;
}

/** Editing: load the group as it is, then open the form filled with it. */
function EditExisting({ id }: { id: string }) {
  const { t } = useI18n();
  const { state, reload } = useCommunity<GroupDetail>('group', { id });
  if (state.status === 'ready') return <GroupForm initial={state.data.group} />;
  return (
    <Screen back title={t.community.groupEdit.titleEdit}>
      {state.status === 'loading' ? (
        <LoadingState label={t.common.loading} />
      ) : (
        <RetryCard message={t.community.errors.load} retryLabel={t.common.retry} onRetry={reload} />
      )}
    </Screen>
  );
}

function GroupForm({ initial }: { initial?: Group }) {
  const { t, lang } = useI18n();
  const c = t.community;
  const ge = c.groupEdit;
  const toast = useToast();
  const act = useCommunityActions();
  // A new group the AI refused is already stored (its creator sees it): the next try edits that one, never a second.
  const [savedId, setSavedId] = useState<string | undefined>();
  const id = initial?.id ?? savedId;
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (hasLink(name) || hasLink(description)) return setError(t.common.noLinks);
    setSaving(true);
    setError(null);
    try {
      const r = await act.saveGroup({ id, name: name.trim(), description: description.trim() || null });
      if (r.status === 'hidden') {
        setSavedId(r.id);
        setError([ge.notPublished, r.reason?.[lang]].filter(Boolean).join(' · '));
        setSaving(false);
        return;
      }
      toast(r.status === 'published' ? (initial ? ge.savedEdit : ge.saved) : ge.pending);
      if (initial) router.back();
      else router.replace(`/community/groups/${r.id}` as Href);
    } catch (e) {
      setSaving(false);
      // First group: the guidelines come first, then back here with the form still filled in.
      if (errorCode(e) === 'terms') {
        router.push({ pathname: '/community/charter', params: { next: 'back' } });
        return;
      }
      setError(communityError(e, t));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={initial ? ge.titleEdit : ge.titleNew}>
        <Card style={{ gap: Spacing.lg }}>
          <Input label={ge.name} value={name} onChangeText={setName} placeholder={ge.namePlaceholder} maxLength={60} />
          <Input
            label={ge.description}
            value={description}
            onChangeText={setDescription}
            placeholder={ge.descriptionPlaceholder}
            multiline
            maxLength={300}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Notice icon="shield" text={ge.aiNote} />
          {error && <InlineMessage kind="error" text={error} />}
          <Button
            label={initial ? ge.saveEdit : ge.save}
            onPress={save}
            loading={saving}
            disabled={name.trim().length < 2}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
