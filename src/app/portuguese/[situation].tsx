import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { PhraseRow, SpeedControl, useSpeaker } from '@/components/portuguese-ui';
import { Screen, Section } from '@/components/screen';
import { AppText } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getSituation } from '@/lib/portuguese';
import { usePortugueseProgress } from '@/lib/portuguese-progress';

/** One situation: the lesson on top, then every phrase (tap to hear it, normal or slower). */
export default function SituationScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.portuguese;
  const { situation: id } = useLocalSearchParams<{ situation: string }>();
  const situation = getSituation(id);
  const { isLearned } = usePortugueseProgress();
  const speaker = useSpeaker();

  if (!situation) {
    return (
      <Screen back title={p.title}>
        <AppText color={theme.textSecondary}>{p.notFound}</AppText>
      </Screen>
    );
  }

  return (
    <Screen back title={situation.title[lang]} subtitle={situation.hint[lang]}>
      <TintCard>
        <TintRow
          first
          icon="school"
          tint={theme.brandSoft}
          ink={theme.brand}
          title={p.lessonTitle}
          subtitle={p.lessonHint}
          accessory={
            <RowPill
              primary
              label={p.start}
              onPress={() => {
                speaker.stop();
                router.push({ pathname: '/portuguese/lesson', params: { situation: situation.id } } as Href);
              }}
            />
          }
        />
      </TintCard>

      <Section title={p.phrases} subtitle={p.phrasesHint}>
        <SpeedControl />
        <TintCard>
          {situation.phrases.map((phrase, i) => (
            <PhraseRow
              key={phrase.id}
              first={i === 0}
              phrase={phrase}
              playing={speaker.playing === phrase.id}
              learned={isLearned(phrase.id)}
              onPress={() => speaker.toggle(phrase)}
            />
          ))}
        </TintCard>
        {/* expo-speech is silent on an iPhone in silent mode. */}
        {Platform.OS === 'ios' && (
          <AppText variant="caption" color={theme.textSecondary}>
            {p.silentMode}
          </AppText>
        )}
      </Section>
    </Screen>
  );
}
