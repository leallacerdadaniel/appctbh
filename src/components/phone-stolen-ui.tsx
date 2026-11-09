import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { DoneToggle } from '@/components/chore-ui';
import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { AppText, Button, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { PrepStep, StepBlock, StepLink } from '@/lib/phone-stolen';

/**
 * "On m'a volé mon téléphone" pieces (2026-11-08). The screens live in `src/app/phone-stolen/`;
 * `PhoneStolenEntry` is the card that leads there (on the SOS page, and wherever the main session places it).
 */

/** Card that opens the stolen-phone guide: red tinted icon, title, one line of what it does. */
export function PhoneStolenEntry() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <TintCard>
      <TintRow
        first
        icon="phoneOff"
        tint={theme.brandSoft}
        ink={theme.brand}
        title={t.phoneStolen.entry}
        subtitle={t.phoneStolen.entryHint}
        onPress={() => router.push('/phone-stolen' as Href)}
      />
    </TintCard>
  );
}

/** "Quelqu'un est blessé ou en danger ?" with two large call buttons (190, 192). */
export function DangerCard() {
  const theme = useTheme();
  const { t } = useI18n();
  const p = t.phoneStolen;
  const calls = [
    { label: p.police, a11y: `${t.emergency.services.police}, 190`, number: '190' },
    { label: p.samu, a11y: `${t.emergency.services.samu}, 192`, number: '192' },
  ];
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface, gap: Spacing.md }]}>
      <View style={styles.headerRow}>
        <View style={[styles.circle, { backgroundColor: theme.brandSoft }]}>
          <Icon name="shield" size={19} color={theme.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{p.danger}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {p.dangerHint}
          </AppText>
        </View>
      </View>
      <View style={styles.callRow}>
        {calls.map((c) => (
          <PressableScale
            key={c.number}
            accessibilityRole="button"
            accessibilityLabel={c.a11y}
            onPress={() => Linking.openURL(`tel:${c.number}`)}
            style={[styles.callButton, { backgroundColor: theme.brandSoft }]}>
            <Icon name="phone" size={17} color={theme.brand} />
            <AppText color={theme.brand} style={{ fontFamily: Fonts.bodySemi }}>
              {c.label}
            </AppText>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** The main way in: a large white card with a red icon circle (the whole card is the button). */
export function ModeCard({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={[styles.modeCard, Shadow.raised, { backgroundColor: theme.surface }]}>
      <View style={[styles.modeCircle, { backgroundColor: theme.brand }]}>
        <Icon name={icon} size={24} color={theme.onBrand} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {hint}
        </AppText>
      </View>
      <Icon name="chevronRight" size={17} color={theme.brand} />
    </PressableScale>
  );
}

/** Icon + short text in a white card ("Tout marche aussi depuis un ordinateur"). */
export function NoteCard({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, Shadow.card, styles.headerRow, { backgroundColor: theme.surface, alignItems: 'flex-start' }]}>
      <Icon name={icon} size={20} color={theme.textSecondary} />
      <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/** "2 sur 6" on the right of a label, then a segmented bar (like the arrival checklist). */
export function ProgressBar({ count, total, label }: { count: number; total: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.sm }} accessible accessibilityLabel={label}>
      <AppText variant="callout" color={theme.textSecondary}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < count ? theme.success : theme.track }}
          />
        ))}
      </View>
    </View>
  );
}

/** Buttons under a paragraph: an official page (globe) or a number to call (phone). Wrap, never truncate. */
export function LinkButtons({ links }: { links: StepLink[] }) {
  const theme = useTheme();
  const { lang } = useI18n();
  return (
    <View style={styles.links}>
      {links.map((l) => (
        <PressableScale
          key={l.kind === 'web' ? l.url : l.number}
          accessibilityRole={l.kind === 'web' ? 'link' : 'button'}
          accessibilityLabel={l.label[lang]}
          onPress={() => Linking.openURL(l.kind === 'web' ? l.url : `tel:${l.number}`)}
          style={[styles.linkButton, { backgroundColor: theme.background }]}>
          <Icon name={l.kind === 'web' ? 'website' : 'phone'} size={16} color={theme.text} />
          <AppText variant="callout" style={{ fontFamily: Fonts.bodySemi, flexShrink: 1 }}>
            {l.label[lang]}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

/** One paragraph of a step: optional small heading, the text, its buttons. */
export function StepBlockView({ block }: { block: StepBlock }) {
  const { lang } = useI18n();
  return (
    <View style={{ gap: Spacing.sm }}>
      {block.heading && <AppText style={{ fontFamily: Fonts.bodySemi }}>{block.heading[lang]}</AppText>}
      <AppText>{block.text[lang]}</AppText>
      {block.links && block.links.length > 0 && <LinkButtons links={block.links} />}
    </View>
  );
}

/**
 * A numbered step of the help mode. Open: icon, "Étape 2 sur 9", title, what it is for, the content and a
 * large "C'est fait". Done: folds to its header with a green check and "Revoir".
 */
export function StepCard({
  n,
  total,
  icon,
  title,
  summary,
  done,
  onToggle,
  children,
}: {
  n: number;
  total: number;
  icon: IconName;
  title: string;
  summary: string;
  done: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const h = t.phoneStolen.help;
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface, gap: Spacing.md }]}>
      <View style={styles.headerRow}>
        <View style={[styles.circle, { backgroundColor: done ? theme.success : theme.brandSoft }]}>
          <Icon name={done ? 'check' : icon} size={19} color={done ? theme.onBrand : theme.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }} accessible accessibilityRole="header">
          <AppText variant="caption" color={theme.textSecondary}>
            {h.step(n, total)}
          </AppText>
          <AppText variant="title" style={done ? { color: theme.textSecondary } : undefined}>
            {title}
          </AppText>
          {!done && (
            <AppText variant="callout" color={theme.textSecondary}>
              {summary}
            </AppText>
          )}
        </View>
        {done && <RowPill label={h.reopen} onPress={onToggle} />}
      </View>
      {!done && (
        <>
          {children}
          <Button
            variant="secondary"
            label={h.done}
            icon={<Icon name="check" size={18} color={theme.text} />}
            onPress={onToggle}
          />
        </>
      )}
    </View>
  );
}

/** A "before it happens" row: tinted icon, title, the how-to, an optional link, and the tick on the right. */
export function PrepRow({
  step,
  done,
  onToggle,
  first = false,
}: {
  step: PrepStep;
  done: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  const { lang } = useI18n();
  return (
    <View style={[styles.prepRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
      <View style={[styles.circle, { backgroundColor: done ? theme.success : theme.brandSoft }]}>
        <Icon name={done ? 'check' : step.icon} size={19} color={done ? theme.onBrand : theme.brand} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi, color: done ? theme.textSecondary : theme.text }}>
          {step.title[lang]}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {step.text[lang]}
        </AppText>
        {step.link && !done && <LinkButtons links={[step.link]} />}
      </View>
      <DoneToggle done={done} label={step.title[lang]} onPress={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  callRow: { flexDirection: 'row', gap: Spacing.sm },
  callButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
  },
  modeCard: {
    borderRadius: Radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 96,
  },
  modeCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  linkButton: {
    minHeight: TapTarget,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  prepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
});
