import * as Speech from 'expo-speech';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { TintCard, TintRow } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { phraseOfTheDay, SPEECH_LANGUAGE, SPEECH_RATE, type Phrase } from '@/lib/portuguese';
import { setSlowSpeech, usePortugueseProgress } from '@/lib/portuguese-progress';

/* ---------- Audio ---------- */

/**
 * Reads phrases aloud in Brazilian Portuguese (expo-speech, the phone's own voice: no network).
 * `playing` is the id of the phrase being read; a new phrase stops the previous one; leaving the screen
 * stops the audio. The slow speed follows the student's choice (`SpeedControl`) unless `speed` is given.
 */
export function useSpeaker() {
  const { slow } = usePortugueseProgress();
  const [playing, setPlaying] = useState<string | null>(null);
  const turn = useRef(0);

  useEffect(
    () => () => {
      Speech.stop().catch(() => {});
    },
    [],
  );

  function play(phrase: Phrase, speed?: keyof typeof SPEECH_RATE) {
    const mine = ++turn.current;
    const end = () => {
      if (turn.current === mine) setPlaying(null);
    };
    setPlaying(phrase.id);
    // Stop whatever is being read (this list or another one), then read the new phrase.
    Speech.stop()
      .catch(() => {})
      .then(() => {
        if (turn.current !== mine) return;
        Speech.speak(phrase.pt, {
          language: SPEECH_LANGUAGE,
          rate: SPEECH_RATE[speed ?? (slow ? 'slow' : 'normal')],
          onDone: end,
          onStopped: end,
          onError: end,
        });
      });
  }

  function stop() {
    turn.current++;
    setPlaying(null);
    Speech.stop().catch(() => {});
  }

  return { playing, play, stop, toggle: (phrase: Phrase) => (playing === phrase.id ? stop() : play(phrase)) };
}

/** Normal or slower reading, remembered on the phone. */
export function SpeedControl() {
  const { t } = useI18n();
  const { slow } = usePortugueseProgress();
  return (
    <SegmentedControl
      options={[
        { value: 'normal', label: t.portuguese.speedNormal },
        { value: 'slow', label: t.portuguese.speedSlow },
      ]}
      value={slow ? 'slow' : 'normal'}
      onChange={(v) => setSlowSpeech(v === 'slow')}
    />
  );
}

/* ---------- Phrases ---------- */

/** "[bon DJI-a]": the pronunciation hint is written for French speakers, so it shows in French only. */
function SayHint({ phrase }: { phrase: Phrase }) {
  const theme = useTheme();
  const { lang } = useI18n();
  if (lang !== 'fr') return null;
  return (
    <AppText variant="caption" color={theme.info}>
      [{phrase.say}]
    </AppText>
  );
}

/** One phrase in a `TintCard`: tap to hear it (tap again to stop). A green check once learned in a lesson. */
export function PhraseRow({
  phrase,
  playing,
  learned,
  onPress,
  first = false,
}: {
  phrase: Phrase;
  playing: boolean;
  learned: boolean;
  onPress: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.portuguese;
  const label = [playing ? p.stop : p.listenA11y(phrase.pt), phrase[lang], learned && p.learned].filter(Boolean).join('. ');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.phraseRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
      <SpeakerCircle playing={playing} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{phrase.pt}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {phrase[lang]}
        </AppText>
        <SayHint phrase={phrase} />
        {phrase.note && (
          <AppText variant="caption" color={theme.textSecondary}>
            {phrase.note[lang]}
          </AppText>
        )}
      </View>
      {learned && <Icon name="checkCircleFill" size={18} color={theme.success} />}
    </PressableScale>
  );
}

function SpeakerCircle({ playing, size = 40 }: { playing: boolean; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: playing ? theme.info : theme.infoSoft },
      ]}>
      <Icon name="speaker" active={playing} size={Math.round(size * 0.45)} color={playing ? theme.onBrand : theme.info} />
    </View>
  );
}

/**
 * "Phrase du jour": one phrase a day (the same all day, situations in turn), with its audio.
 * `link` adds "Apprendre d’autres phrases" → `/portuguese` (off on that page itself).
 */
export function PhraseOfTheDay({ link = true }: { link?: boolean }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.portuguese;
  const { phrase, situation } = phraseOfTheDay();
  const speaker = useSpeaker();
  const playing = speaker.playing === phrase.id;

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.dayTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {`${p.phraseOfDay} · ${situation.title[lang]}`}
          </AppText>
          <AppText variant="title">{phrase.pt}</AppText>
          <AppText color={theme.textSecondary}>{phrase[lang]}</AppText>
          <SayHint phrase={phrase} />
          {phrase.note && (
            <AppText variant="caption" color={theme.textSecondary}>
              {phrase.note[lang]}
            </AppText>
          )}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={playing ? p.stop : p.listenA11y(phrase.pt)}
          onPress={() => speaker.toggle(phrase)}>
          <SpeakerCircle playing={playing} size={48} />
        </PressableScale>
      </View>
      {link && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/portuguese' as Href)}
          style={[styles.dayLink, { borderTopColor: theme.line }]}>
          <AppText variant="callout" color={theme.brand} style={{ flex: 1, fontFamily: Fonts.bodySemi }}>
            {p.morePhrases}
          </AppText>
          <Icon name="chevronRight" size={15} color={theme.brand} />
        </PressableScale>
      )}
    </View>
  );
}

/* ---------- Entry and progress ---------- */

/**
 * Entry to "Parler portugais" for Explorer › Pratique (or anywhere): a tinted-circle row with the
 * streak and phrases learned once the student started. `variant="row"` goes inside an existing
 * `TintCard` (pass `first` for its first row); the default draws its own card.
 */
export function PortugueseEntry({ variant = 'card', first = true }: { variant?: 'card' | 'row'; first?: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const p = t.portuguese;
  const { streak, learnedCount } = usePortugueseProgress();
  const started = streak > 0 || learnedCount > 0;

  const row = (
    <TintRow
      first={first}
      icon="translate"
      tint={theme.infoSoft}
      ink={theme.info}
      title={p.title}
      subtitle={started ? p.entryStatus(streak, learnedCount) : p.entryHint}
      onPress={() => router.push('/portuguese' as Href)}
    />
  );
  return variant === 'row' ? row : <TintCard>{row}</TintCard>;
}

/** Streak and phrases learned, side by side (top of the "Parler portugais" page). */
export function ProgressStats() {
  const theme = useTheme();
  const { t } = useI18n();
  const p = t.portuguese;
  const { streak, doneToday, learnedCount, totalCount } = usePortugueseProgress();
  const streakHint = doneToday ? p.streakToday : streak > 0 ? p.streakKeep : p.streakStart;

  return (
    <View style={styles.stats}>
      <Stat icon="streak" tint={theme.warningSoft} ink={theme.warning} value={p.streakValue(streak)} label={streakHint} />
      <Stat
        icon="checkCircle"
        tint={theme.successSoft}
        ink={theme.success}
        value={p.learnedValue(learnedCount, totalCount)}
        label={p.learnedLabel}
      />
    </View>
  );
}

function Stat({ icon, tint, ink, value, label }: { icon: IconName; tint: string; ink: string; value: string; label: string }) {
  const theme = useTheme();
  return (
    <View accessible style={[styles.stat, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={[styles.circle, styles.statCircle, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={ink} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{value}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

/* ---------- Ask the assistant ---------- */

/**
 * "Comment dit-on ?": the student types what they want to say, the assistant opens with
 * "Comment dit-on « … » en portugais du Brésil ?" already sent (`/assistant?q=`).
 * Keep it near the top of a screen: the keyboard would cover it lower down.
 */
export function AskHowToSay() {
  const theme = useTheme();
  const { t } = useI18n();
  const a = t.portuguese.ask;
  const [text, setText] = useState('');
  const question = text.trim();

  function ask() {
    if (!question) return;
    router.push({ pathname: '/assistant', params: { q: a.question(question) } } as Href);
    setText('');
  }

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.askTop}>
        <View style={[styles.circle, { backgroundColor: theme.brandSoft }]}>
          <Icon name="sparkles" size={19} color={theme.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{a.title}</AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            {a.hint}
          </AppText>
        </View>
      </View>
      <View style={styles.askRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={a.placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={a.title}
          returnKeyType="send"
          onSubmitEditing={ask}
          maxLength={200}
          style={[styles.askInput, Type.body, { color: theme.text, backgroundColor: theme.fill }]}
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={a.send}
          accessibilityState={{ disabled: !question }}
          disabled={!question}
          onPress={ask}
          style={[styles.send, { backgroundColor: question ? theme.text : theme.fill }]}>
          <Icon name="send" size={20} color={question ? theme.surface : theme.textTertiary} />
        </PressableScale>
      </View>
    </View>
  );
}

/* ---------- Lesson pieces ---------- */

/** Green bar on the `track` gray: questions answered out of the lesson. */
export function LessonProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={[styles.track, { backgroundColor: theme.track }]}>
      <View style={[styles.bar, { width: `${(done / Math.max(total, 1)) * 100}%`, backgroundColor: theme.success }]} />
    </View>
  );
}

export type OptionState = 'idle' | 'right' | 'wrong' | 'dim';

/** One answer of a question. After answering: the right one green, a wrong pick in `error`, the rest dimmed. */
export function AnswerOption({
  label,
  state,
  onPress,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const l = t.portuguese.lesson;
  const answered = state !== 'idle';
  const bg = state === 'right' ? theme.successSoft : state === 'wrong' ? theme.errorSoft : theme.surface;
  const fg = state === 'right' ? theme.success : state === 'wrong' ? theme.error : theme.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[label, state === 'right' && l.rightA11y, state === 'wrong' && l.wrongA11y].filter(Boolean).join('. ')}
      accessibilityState={{ disabled: answered }}
      disabled={answered}
      // The lesson gives its own success / error haptic.
      haptic={false}
      onPress={onPress}
      style={[styles.option, state === 'idle' && Shadow.card, { backgroundColor: bg, opacity: state === 'dim' ? 0.55 : 1 }]}>
      <AppText color={fg} style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
      {state === 'right' && <Icon name="checkCircleFill" size={20} color={theme.success} />}
      {state === 'wrong' && <Icon name="close" size={18} color={theme.error} />}
    </PressableScale>
  );
}

/** A phrase with its meaning and pronunciation, and a button to hear it (lesson feedback). */
export function PhraseAnswer({ phrase, playing, onListen }: { phrase: Phrase; playing: boolean; onListen: () => void }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <View style={styles.dayTop}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{phrase.pt}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {phrase[lang]}
        </AppText>
        <SayHint phrase={phrase} />
        {phrase.note && (
          <AppText variant="caption" color={theme.textSecondary}>
            {phrase.note[lang]}
          </AppText>
        )}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={playing ? t.portuguese.stop : t.portuguese.listenA11y(phrase.pt)}
        onPress={onListen}>
        <SpeakerCircle playing={playing} size={TapTarget} />
      </PressableScale>
    </View>
  );
}

/** Big round "listen" button for the listening questions. */
export function ListenButton({ playing, label, onPress }: { playing: boolean; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <SpeakerCircle playing={playing} size={64} />
    </PressableScale>
  );
}

/** Small `fill` pill with an icon (36 pt, 44 pt touch area): "Plus lent", "Afficher la phrase". */
export function SmallPill({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={PILL_SLOP}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: theme.fill }]}>
      <Icon name={icon} size={15} color={theme.text} />
      <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const PILL_HEIGHT = 36;
const PILL_SLOP = { top: (TapTarget - PILL_HEIGHT) / 2, bottom: (TapTarget - PILL_HEIGHT) / 2 };

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.md, gap: 12 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  phraseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, minHeight: 64 },
  dayTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dayLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: TapTarget,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: -Spacing.sm,
  },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: Radius.lg, padding: 14, gap: 10 },
  statCircle: { width: 36, height: 36, borderRadius: 18 },
  askTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  askInput: {
    // No browser outline on web; the field is already on `fill`.
    ...({ outlineStyle: 'none' } as object),
    flex: 1,
    minHeight: TapTarget,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
  },
  send: { width: TapTarget, height: TapTarget, borderRadius: TapTarget / 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  bar: { height: 8, borderRadius: Radius.pill },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: PILL_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
});
