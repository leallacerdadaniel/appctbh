import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { ChipWrap, Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { communityError, useCommunityActions, type ReportReason, type ReportTarget } from '@/lib/community';

const REASONS: ReportReason[] = ['harassment', 'inappropriate', 'danger', 'personal_data', 'spam', 'other'];

/** Report a post, comment or trip to the team. Three reports from different people hide it until the team decides. */
export default function ReportScreen() {
  const { t } = useI18n();
  const r = t.community.report;
  const toast = useToast();
  const act = useCommunityActions();
  const { type, id } = useLocalSearchParams<{ type: ReportTarget; id: string }>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await act.report(type, id, reason, note.trim() || undefined);
      toast(r.sent);
      router.back();
    } catch (e) {
      setError(communityError(e, t));
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={r.title} subtitle={r.subtitle}>
        <Card style={{ gap: Spacing.lg }}>
          <ChipWrap>
            {REASONS.map((k) => (
              <Chip key={k} label={r.reasons[k]} selected={k === reason} onPress={() => setReason(k)} />
            ))}
          </ChipWrap>
          {reason === 'danger' && <Notice icon="emergency" tone="warning" text={r.danger} />}
          <Input
            label={r.note}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          {error && <InlineMessage kind="error" text={error} />}
          <Button label={r.send} onPress={send} loading={sending} disabled={!reason} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
