import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ChipWrap, FieldLabel, Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { FEEDBACK_TOPICS, feedbackErrorText, useFeedbackActions, type FeedbackTopic } from '@/lib/feedback';
import { trackAction } from '@/lib/usage';

const MAX_LENGTH = 2000;

/** New feedback: what it is about (chips, "Général" by default) and the message. `?topic=` preselects one. */
export default function NewFeedbackScreen() {
  const toast = useToast();
  const { t, lang } = useI18n();
  const f = t.feedback;
  const params = useLocalSearchParams<{ topic?: string }>();
  const { sendFeedback } = useFeedbackActions();

  const [topic, setTopic] = useState<FeedbackTopic>(() =>
    FEEDBACK_TOPICS.includes(params.topic as FeedbackTopic) ? (params.topic as FeedbackTopic) : 'general',
  );
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setError(null);
    if (!body.trim()) return setError(f.errors.empty);
    setSending(true);
    try {
      await sendFeedback({ topic, body: body.trim(), lang });
      trackAction('feedback_sent', topic);
      toast(f.thanks);
      if (router.canGoBack()) router.back();
      else router.replace('/feedback' as Href);
    } catch (e) {
      setError(feedbackErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <Screen back title={f.newTitle} subtitle={f.newSubtitle}>
      <Card style={{ gap: Spacing.md }}>
        <FieldLabel>{f.topic}</FieldLabel>
        <ChipWrap>
          {FEEDBACK_TOPICS.map((x) => (
            <Chip key={x} label={f.topics[x]} selected={x === topic} onPress={() => setTopic(x)} />
          ))}
        </ChipWrap>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <Input
          label={f.message}
          placeholder={f.placeholder}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={MAX_LENGTH}
          autoCapitalize="sentences"
          style={styles.message}
        />
        <Notice icon="info" text={f.urgent} />
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <Button label={f.send} onPress={send} loading={sending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 },
});
