import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { NoteCard, ProgressBar, StepBlockView, StepCard } from '@/components/phone-stolen-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Chip } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import { HELP_STEPS } from '@/lib/phone-stolen';
import { openWhatsApp } from '@/lib/whatsapp';

const TEAM_STEP = 'team';

/**
 * "Téléphone volé : pas à pas" (2026-11-08): the roommate goes through the steps on their own phone with the
 * victim, in order. Each step has a big "C'est fait" and folds once done; ticks live in this screen only.
 * The last step writes to the team on WhatsApp for the victim (who is chosen among the roommates).
 */
export default function PhoneStolenHelpScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const p = t.phoneStolen;
  const h = p.help;
  const { student, apartment, roommates } = useHome();
  const [done, setDone] = useState<string[]>([]);
  const [victim, setVictim] = useState<string | null>(null);

  const total = HELP_STEPS.length + 1;
  const count = done.length;
  const isDone = (id: string) => done.includes(id);
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  function writeTeam() {
    openWhatsApp('phone-stolen', h.message(student.firstName, apartment.nickname || apartment.address, victim));
    if (!isDone(TEAM_STEP)) toggle(TEAM_STEP);
  }

  return (
    <Screen back title={h.title} subtitle={h.subtitle}>
      <View style={{ gap: Spacing.md }}>
        <ProgressBar count={count} total={total} label={h.progress(count, total)} />
        <NoteCard icon="laptop" text={p.computer} />
      </View>

      <View style={{ gap: Spacing.md }}>
        {HELP_STEPS.map((s, i) => (
          <StepCard
            key={s.id}
            n={i + 1}
            total={total}
            icon={s.icon}
            title={s.title[lang]}
            summary={s.summary[lang]}
            done={isDone(s.id)}
            onToggle={() => toggle(s.id)}>
            {s.blocks.map((b, j) => (
              <StepBlockView key={j} block={b} />
            ))}
          </StepCard>
        ))}

        <StepCard
          n={total}
          total={total}
          icon="whatsapp"
          title={h.team}
          summary={h.teamSummary}
          done={isDone(TEAM_STEP)}
          onToggle={() => toggle(TEAM_STEP)}>
          <AppText>{h.teamText}</AppText>
          {roommates.length > 0 && (
            <View style={{ gap: Spacing.sm }}>
              <AppText style={{ fontFamily: Fonts.bodySemi }}>{h.who}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {roommates.map((r) => (
                  <Chip
                    key={r.fullName}
                    label={r.firstName}
                    selected={victim === r.firstName}
                    onPress={() => setVictim((v) => (v === r.firstName ? null : r.firstName))}
                  />
                ))}
              </View>
            </View>
          )}
          <Button
            label={h.writeTeam}
            icon={<Icon name="whatsapp" size={18} color={theme.onBrand} />}
            onPress={writeTeam}
          />
        </StepCard>
      </View>

      {count === total && (
        <AppText color={theme.success} style={{ fontFamily: Fonts.bodySemi }}>
          {h.finished}
        </AppText>
      )}

      <AppText variant="caption" color={theme.textSecondary}>
        {p.sources}
      </AppText>
    </Screen>
  );
}
