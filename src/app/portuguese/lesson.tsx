import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  AnswerOption,
  LessonProgress,
  ListenButton,
  PhraseAnswer,
  ProgressStats,
  SmallPill,
  useSpeaker,
  type OptionState,
} from '@/components/portuguese-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { buildLesson, getSituation, type Phrase } from '@/lib/portuguese';
import { finishLesson, usePortugueseProgress } from '@/lib/portuguese-progress';

/**
 * "Mode leçon": 5 questions from one situation (`?situation=ride`). Written questions show the meaning
 * and ask for the Portuguese; listening ones read the Portuguese aloud and ask for the meaning. Each
 * answer is checked at once (the right one in green, a wrong pick in `error`), then the score; phrases
 * answered right become learned and the lesson counts for the day's streak (kept on the phone).
 */
export default function LessonScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.portuguese;
  const l = p.lesson;
  const { situation: id } = useLocalSearchParams<{ situation: string }>();
  const situation = getSituation(id);
  const { isLearned } = usePortugueseProgress();
  const speaker = useSpeaker();

  const [questions, setQuestions] = useState(() => (situation ? buildLesson(situation, isLearned) : []));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  if (!situation || questions.length === 0) {
    return (
      <Screen back title={p.lessonTitle}>
        <AppText color={theme.textSecondary}>{p.notFound}</AppText>
      </Screen>
    );
  }

  const total = questions.length;
  const finished = index >= total;
  const q = questions[Math.min(index, total - 1)];
  const right = chosen === q.answer.id;

  function choose(option: Phrase) {
    if (chosen) return;
    const ok = option.id === q.answer.id;
    setChosen(option.id);
    if (ok) setCorrect((c) => [...c, q.answer.id]);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    }
    // After a written question, hear the right answer (listening questions were just heard).
    if (q.kind === 'toPt') speaker.play(q.answer);
  }

  function next() {
    const n = index + 1;
    setIndex(n);
    setChosen(null);
    setRevealed(false);
    if (n >= total) finishLesson(correct);
    else if (questions[n].kind === 'listen') speaker.play(questions[n].answer);
  }

  function restart() {
    if (!situation) return;
    speaker.stop();
    setQuestions(buildLesson(situation, isLearned));
    setIndex(0);
    setChosen(null);
    setCorrect([]);
    setRevealed(false);
  }

  function backToPhrases() {
    if (router.canGoBack()) router.back();
    else if (situation) router.replace({ pathname: '/portuguese/[situation]', params: { situation: situation.id } } as Href);
  }

  if (finished) {
    const score = correct.length;
    const message = score === total ? l.perfect : score >= Math.ceil(total * 0.6) ? l.good : l.keepGoing;
    return (
      <Screen back title={p.lessonTitle} subtitle={situation.title[lang]}>
        <Card style={styles.result}>
          <View style={[styles.medal, { backgroundColor: theme.warningSoft }]}>
            <Icon name="award" size={30} color={theme.warning} />
          </View>
          <AppText variant="display">{l.score(score, total)}</AppText>
          <AppText variant="title">{message}</AppText>
          <AppText variant="callout" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {l.countsAsLearned}
          </AppText>
        </Card>
        <ProgressStats />
        <View style={{ gap: 12 }}>
          <Button label={l.again} onPress={restart} />
          <Button variant="secondary" label={l.backToPhrases} onPress={backToPhrases} />
        </View>
      </Screen>
    );
  }

  const stateOf = (o: Phrase): OptionState =>
    !chosen ? 'idle' : o.id === q.answer.id ? 'right' : o.id === chosen ? 'wrong' : 'dim';
  const playing = speaker.playing === q.answer.id;

  // No big title while answering: the question, the options and "Continuer" fit on one phone screen.
  return (
    <Screen back>
      <View style={styles.block}>
        <View style={{ gap: Spacing.sm }}>
          <LessonProgress done={index + (chosen ? 1 : 0)} total={total} label={l.progress(index + 1, total)} />
          <AppText variant="caption" color={theme.textSecondary}>
            {`${situation.title[lang]} · ${l.progress(index + 1, total)}`}
          </AppText>
        </View>

        <Card style={{ gap: 12 }}>
          <AppText variant="callout" color={theme.textSecondary}>
            {q.kind === 'toPt' ? l.toPt : l.listen}
          </AppText>
          {q.kind === 'toPt' ? (
            <AppText variant="title">{q.answer[lang]}</AppText>
          ) : (
            <>
              <View style={styles.listenRow}>
                <ListenButton playing={playing} label={l.play} onPress={() => speaker.play(q.answer)} />
                <SmallPill icon="slow" label={l.playSlow} onPress={() => speaker.play(q.answer, 'slow')} />
                {!revealed && !chosen && <SmallPill icon="show" label={l.reveal} onPress={() => setRevealed(true)} />}
              </View>
              {(revealed || !!chosen) && <AppText style={{ fontFamily: Fonts.bodySemi }}>{q.answer.pt}</AppText>}
            </>
          )}
        </Card>

        <View style={{ gap: 10 }}>
          {q.options.map((o) => (
            <AnswerOption
              key={o.id}
              label={q.kind === 'toPt' ? o.pt : o[lang]}
              state={stateOf(o)}
              onPress={() => choose(o)}
            />
          ))}
        </View>
      </View>

      {chosen && (
        <View style={styles.block}>
          <Card style={{ gap: 12 }}>
            <View accessibilityRole="alert" style={styles.verdict}>
              <Icon name={right ? 'checkCircleFill' : 'close'} size={20} color={right ? theme.success : theme.error} />
              <AppText variant="title" color={right ? theme.success : theme.error}>
                {right ? l.right : l.wrong}
              </AppText>
            </View>
            {!right && (
              <AppText variant="caption" color={theme.textSecondary}>
                {l.answer}
              </AppText>
            )}
            <PhraseAnswer phrase={q.answer} playing={playing} onListen={() => speaker.toggle(q.answer)} />
          </Card>
          <Button label={index === total - 1 ? l.finish : l.next} onPress={next} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.md },
  listenRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  result: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  medal: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
