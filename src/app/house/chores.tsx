import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Card, Chip, PressableScale, tapFeedback } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import { houseHref } from '@/lib/house';
import { useStore } from '@/store';
import { swapChore, toggleChoreDone } from '@/store/actions';
import { choreWeek, me, residentById, roommates, thisWeek, weekAfter } from '@/store/selectors';
import type { ID } from '@/store/types';

const ME = me().id;

export default function ChoresScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const week = thisWeek();
  const items = useStore((s) => choreWeek(s, week));
  const upcoming = useStore((s) =>
    [1, 2, 3].map((n) => ({ weekStart: weekAfter(week, n), items: choreWeek(s, weekAfter(week, n)) })),
  );
  const [swapping, setSwapping] = useState<ID | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const nameOf = (id: ID) => (id === ME ? t.chores.you : (residentById(id)?.firstName ?? '?'));
  const doneCount = items.filter((i) => i.done).length;

  async function toggle(choreId: ID, wasDone: boolean) {
    setBusy(`done-${choreId}`);
    try {
      await toggleChoreDone(choreId, week);
      toast(wasDone ? t.chores.undoneToast : t.chores.doneToast);
    } catch {
      toast(t.chores.error);
    } finally {
      setBusy(null);
    }
  }

  async function swap(choreId: ID, residentId: ID) {
    setBusy(`swap-${choreId}`);
    try {
      await swapChore(choreId, week, residentId);
      setSwapping(null);
      toast(t.chores.swapToast(nameOf(residentId)));
    } catch {
      toast(t.chores.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen back title={t.chores.title} subtitle={t.chores.subtitle}>
      <Section
        title={t.chores.thisWeek}
        subtitle={`${t.chores.weekOf(formatShortDate(week, lang))} · ${t.chores.progress(doneCount, items.length)}`}>
        <Card>
          <ListGroup>
            {items.map(({ chore, assignee, done }) => {
              const mine = assignee === ME;
              const person = residentById(assignee);
              const isSwapping = swapping === chore.id;
              return (
                <View key={chore.id} style={styles.choreBlock}>
                  <View style={styles.choreRow}>
                    <View style={[styles.emojiCircle, { backgroundColor: theme.fill }]}>
                      <Text style={styles.emoji} allowFontScaling={false}>
                        {chore.emoji}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText
                        style={done && { color: theme.textSecondary, textDecorationLine: 'line-through' }}>
                        {chore.name[lang]}
                      </AppText>
                      <View style={styles.assignee}>
                        <Avatar initials={person?.initials ?? '?'} size={24} />
                        <AppText
                          variant="callout"
                          color={mine ? theme.text : theme.textSecondary}
                          style={mine && { fontFamily: Fonts.bodyMedium }}>
                          {nameOf(assignee)}
                        </AppText>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done, busy: busy === `done-${chore.id}` }}
                      accessibilityLabel={`${chore.name[lang]}, ${done ? t.chores.markUndone : t.chores.markDone}`}
                      disabled={busy !== null}
                      onPress={() => {
                        tapFeedback();
                        toggle(chore.id, done);
                      }}
                      style={styles.check}>
                      {busy === `done-${chore.id}` ? (
                        <ActivityIndicator color={theme.textSecondary} />
                      ) : (
                        <View
                          style={[
                            styles.checkCircle,
                            done
                              ? { backgroundColor: theme.success, borderColor: theme.success }
                              : { borderColor: theme.line },
                          ]}>
                          {done && <Icon name="check" size={16} color={theme.onBrand} />}
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {mine && !isSwapping && (
                    <PressableScale
                      accessibilityRole="button"
                      onPress={() => setSwapping(chore.id)}
                      style={styles.swapButton}>
                      <Icon name="swap" size={17} color={theme.brand} />
                      <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
                        {t.chores.swap}
                      </AppText>
                    </PressableScale>
                  )}

                  {mine && isSwapping && (
                    <View style={styles.swapPanel}>
                      <AppText variant="callout" color={theme.textSecondary}>
                        {t.chores.swapQuestion}
                      </AppText>
                      <View style={styles.chips}>
                        {roommates().map((r) => (
                          <Chip
                            key={r.id}
                            label={r.firstName}
                            selected={false}
                            onPress={() => busy === null && swap(chore.id, r.id)}
                          />
                        ))}
                        <Chip label={t.chores.cancel} selected={false} onPress={() => setSwapping(null)} />
                      </View>
                      {busy === `swap-${chore.id}` && <ActivityIndicator color={theme.textSecondary} />}
                    </View>
                  )}
                </View>
              );
            })}
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.chores.nextWeeks} subtitle={t.chores.nextWeeksHint}>
        <Card>
          <ListGroup>
            {upcoming.map((w) => (
              <View key={w.weekStart} style={styles.weekRow}>
                <AppText style={{ fontFamily: Fonts.bodyMedium }}>
                  {t.chores.weekOf(formatShortDate(w.weekStart, lang))}
                </AppText>
                {w.items.map(({ chore, assignee }) => (
                  <View key={chore.id} style={styles.previewLine}>
                    <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
                      {chore.name[lang]}
                    </AppText>
                    <AppText
                      variant="callout"
                      color={assignee === ME ? theme.text : theme.textSecondary}
                      style={assignee === ME && { fontFamily: Fonts.bodyMedium }}>
                      {nameOf(assignee)}
                    </AppText>
                  </View>
                ))}
              </View>
            ))}
          </ListGroup>
        </Card>
      </Section>

      <Card>
        <ListGroup>
          <ListRow
            icon="supermarket"
            title={t.chores.groceriesLink}
            subtitle={t.chores.groceriesHint}
            onPress={() =>
              router.push(
                houseHref('/house/expenses/new', { category: 'groceries', title: t.chores.groceriesTitle }),
              )
            }
          />
          <ListRow
            icon="cleaning"
            title={t.chores.cleaningLink}
            subtitle={t.chores.howItWorks}
            onPress={() => router.push(houseHref('/apartment/cleaning'))}
          />
        </ListGroup>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choreBlock: { paddingVertical: Spacing.md, gap: Spacing.sm },
  choreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emojiCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  check: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center' },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: TapTarget,
    marginLeft: 44 + Spacing.md,
  },
  swapPanel: { gap: Spacing.sm, marginLeft: 44 + Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  weekRow: { paddingVertical: Spacing.md, gap: Spacing.xs },
  previewLine: { flexDirection: 'row', gap: Spacing.md },
});
