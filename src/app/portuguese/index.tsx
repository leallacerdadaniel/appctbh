import { router, type Href } from 'expo-router';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { AskHowToSay, PhraseOfTheDay, ProgressStats } from '@/components/portuguese-ui';
import { Screen, Section } from '@/components/screen';
import { useI18n } from '@/i18n';
import { SITUATIONS } from '@/lib/portuguese';
import { usePortugueseProgress } from '@/lib/portuguese-progress';

/**
 * "Parler portugais" (2026-11-08, owner: "uma espécie de duolingo dentro do app"): ask the assistant how
 * to say something, the phrase of the day, the streak, then one tile per situation (phrases with audio
 * and a 5-question lesson). Everything works offline; progress stays on the phone.
 */
export default function PortugueseScreen() {
  const { t, lang } = useI18n();
  const p = t.portuguese;
  const { learnedIn } = usePortugueseProgress();

  return (
    <Screen back title={p.title} subtitle={p.subtitle}>
      {/* First on the page: lower down, the keyboard would cover the field. */}
      <AskHowToSay />
      <PhraseOfTheDay link={false} />
      <ProgressStats />
      <Section title={p.situations} subtitle={p.situationsHint}>
        <HubGrid>
          {SITUATIONS.map((s) => (
            <HubTile
              key={s.id}
              emoji={s.emoji}
              title={s.title[lang]}
              status={p.tileStatus(learnedIn(s), s.phrases.length)}
              onPress={() => router.push({ pathname: '/portuguese/[situation]', params: { situation: s.id } } as Href)}
            />
          ))}
        </HubGrid>
      </Section>
    </Screen>
  );
}
