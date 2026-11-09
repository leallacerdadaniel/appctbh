import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckRow, ScoreScale } from '@/components/feedback-ui';
import { Icon } from '@/components/icon';
import { FieldLabel, StarRating } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  SURVEY_SCORES,
  surveyErrorText,
  useFeedbackActions,
  useSurveyStatus,
  type SurveyKind,
  type SurveyScoreKey,
} from '@/lib/feedback';
import { trackAction } from '@/lib/usage';

/** A promoter (9 or 10) is offered the referral code on the thank-you card. */
const PROMOTER = 9;

/**
 * The stay survey (Accueil invites to it while it is due): 0–10 "would you recommend", four optional
 * star ratings, a comment, and at the end of the stay the permission to use the comment as a testimonial.
 * `?kind=mid|end` comes from the Accueil row; without it the screen asks the server which one is due.
 */
export default function SurveyScreen() {
  const { t } = useI18n();
  const s = t.survey;
  const params = useLocalSearchParams<{ kind?: string }>();
  const asked: SurveyKind | null = params.kind === 'mid' || params.kind === 'end' ? params.kind : null;
  const { state, reload } = useSurveyStatus();
  // The kind is fixed once the screen has one, so the form doesn't switch after it is sent.
  const [sent, setSent] = useState<{ kind: SurveyKind; nps: number } | null>(null);

  const status = state.status === 'ready' ? state.data : null;
  const kind = sent?.kind ?? asked ?? status?.due ?? null;
  const title = kind === 'end' ? s.titleEnd : s.titleMid;

  if (sent) {
    return (
      <Screen back title={title}>
        <Thanks promoter={sent.nps >= PROMOTER} />
      </Screen>
    );
  }

  // With ?kind=, the form shows at once; the status only says whether it was already answered.
  const answered = !!kind && !!status?.answered.includes(kind);
  return (
    <Screen back title={title} subtitle={kind && !answered ? s.subtitle : undefined} onRefresh={reload}>
      {!asked && state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {!asked && state.status === 'error' && (
        <RetryCard message={s.unavailable} retryLabel={t.common.retry} onRetry={reload} />
      )}
      {answered ? (
        <Message text={s.already} />
      ) : kind ? (
        <Form kind={kind} onSent={(nps) => setSent({ kind, nps })} />
      ) : (
        state.status === 'ready' && <Message text={s.nothing} feedback />
      )}
    </Screen>
  );
}

function Form({ kind, onSent }: { kind: SurveyKind; onSent: (nps: number) => void }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const s = t.survey;
  const { sendSurvey } = useFeedbackActions();

  const [nps, setNps] = useState<number | null>(null);
  const [scores, setScores] = useState<Partial<Record<SurveyScoreKey, number>>>({});
  const [comment, setComment] = useState('');
  const [testimonial, setTestimonial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function setScore(key: SurveyScoreKey, n: number) {
    // Tapping the chosen star again clears it (every score is optional).
    setScores((prev) => ({ ...prev, [key]: prev[key] === n ? undefined : n }));
  }

  async function send() {
    setError(null);
    if (nps === null) return setError(s.errors.nps);
    setSending(true);
    const text = comment.trim();
    try {
      await sendSurvey({
        kind,
        nps,
        scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v)),
        comment: text || null,
        testimonialOk: kind === 'end' && !!text && testimonial,
        lang,
      });
      trackAction('survey_sent', kind);
      onSent(nps);
    } catch (e) {
      setError(surveyErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{s.npsQuestion}</AppText>
        <ScoreScale value={nps} onChange={setNps} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <FieldLabel hint={s.detailsHint}>{s.details}</FieldLabel>
        {SURVEY_SCORES.map((key, i) => (
          <View key={key} style={[styles.score, i > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{s.scores[key]}</AppText>
            <StarRating value={scores[key] ?? 0} onChange={(n) => setScore(key, n)} />
          </View>
        ))}
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <Input
          label={s.comment}
          placeholder={s.commentPlaceholder}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={2000}
          autoCapitalize="sentences"
          style={styles.comment}
        />
        {kind === 'end' && !!comment.trim() && (
          <CheckRow checked={testimonial} label={s.testimonial} onChange={setTestimonial} />
        )}
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <Button label={s.send} onPress={send} loading={sending} />
    </>
  );
}

function Thanks({ promoter }: { promoter: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const s = t.survey;
  return (
    <>
      <Card style={{ gap: Spacing.md, alignItems: 'center' }}>
        <View style={[styles.thanksIcon, { backgroundColor: theme.successSoft }]}>
          <Icon name="heart" size={26} color={theme.success} />
        </View>
        <AppText variant="title" style={{ textAlign: 'center' }}>
          {s.thanksTitle}
        </AppText>
        <AppText color={theme.textSecondary} style={{ textAlign: 'center' }}>
          {s.thanks}
        </AppText>
      </Card>
      {promoter && (
        <Card style={{ gap: Spacing.md }}>
          <AppText>{s.referralInvite}</AppText>
          <Button
            variant="secondary"
            label={s.referralCta}
            icon={<Icon name="gift" size={17} color={theme.text} />}
            onPress={() => router.replace('/referral' as Href)}
          />
        </Card>
      )}
      <Button label={s.close} onPress={close} />
    </>
  );
}

/** A short message instead of the form (nothing due, or already answered). */
function Message({ text, feedback = false }: { text: string; feedback?: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Card style={{ gap: Spacing.md }}>
      <AppText color={theme.textSecondary}>{text}</AppText>
      {feedback && (
        <Button variant="secondary" label={t.feedback.give} onPress={() => router.replace('/feedback/new' as Href)} />
      )}
    </Card>
  );
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  score: { gap: 2, paddingTop: Spacing.sm },
  comment: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  thanksIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
