import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoreRow, DoneToggle, PillButton } from '@/components/chore-ui';
import { PersonPicker } from '@/components/expense-ui';
import { Icon } from '@/components/icon';
import { ListGroup } from '@/components/list';
import { FieldLabel } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  choreById,
  choreErrorText,
  memberLabel,
  useChoreActions,
  useChores,
  weekDate,
  type ChoreItem,
  type ChoresData,
} from '@/lib/chores';

const editHref = (id?: string) => (id ? `/house/chore-edit?id=${id}` : '/house/chore-edit') as Href;

/** House chores: this week (tick, swap), the next 3 weeks, and the chores themselves. */
export default function ChoresScreen() {
  const { t } = useI18n();
  const { state, reload } = useChores();
  return (
    <Screen back title={t.chores.title} subtitle={t.chores.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && (
        <RetryCard message={t.chores.unavailable} retryLabel={t.common.retry} onRetry={reload} />
      )}
      {state.status === 'ready' && <Content data={state.data} />}
    </Screen>
  );
}

function Content({ data }: { data: ChoresData }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const c = t.chores;
  const act = useChoreActions();
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const who = (cp: string | null) => memberLabel(data, cp, c.you, c.formerRoommate);
  const [week, ...nextWeeks] = data.weeks;
  const items = (week?.items ?? []).filter((i) => choreById(data, i.choreId));

  if (data.chores.length === 0) {
    return (
      <Card style={{ gap: Spacing.md }}>
        <View style={{ gap: Spacing.xs }}>
          <AppText variant="title">{c.emptyTitle}</AppText>
          <AppText color={theme.textSecondary}>{c.empty}</AppText>
        </View>
        <Button
          label={c.createFirst}
          icon={<Icon name="plus" size={17} color={theme.onBrand} />}
          onPress={() => router.push(editHref())}
        />
      </Card>
    );
  }

  async function toggle(item: ChoreItem) {
    if (!week) return;
    setError(null);
    try {
      await act.setDone(item.choreId, week.weekStart, !item.done, data.me);
    } catch (e) {
      setError(choreErrorText(e, t, 'action'));
    }
  }

  return (
    <>
      {week && (
        <Section title={c.thisWeek} subtitle={c.weekOf(weekDate(week.weekStart, lang))}>
          <Card style={styles.listCard}>
            <ListGroup>
              {items.map((item) => {
                const chore = choreById(data, item.choreId)!;
                const mine = item.assignee === data.me;
                const status = item.done
                  ? item.doneBy === data.me
                    ? c.doneByYou
                    : c.doneBy(who(item.doneBy))
                  : [who(item.assignee), item.swapped && c.swappedNote].filter(Boolean).join(' · ');
                return (
                  <View key={item.choreId}>
                    <ChoreRow
                      emoji={chore.emoji}
                      title={chore.name}
                      subtitle={status}
                      subtitleColor={item.done ? theme.success : mine ? theme.text : undefined}
                      accessory={
                        <DoneToggle
                          done={item.done}
                          label={item.done ? c.markUndone(chore.name) : c.markDone(chore.name)}
                          onPress={() => toggle(item)}
                        />
                      }>
                      {mine && !item.done && swapping !== item.choreId && data.members.length > 1 && (
                        <PillButton icon="swap" label={c.swap} onPress={() => setSwapping(item.choreId)} />
                      )}
                    </ChoreRow>
                    {swapping === item.choreId && (
                      <SwapPanel
                        data={data}
                        choreName={chore.name}
                        onCancel={() => setSwapping(null)}
                        onSwap={async (cp) => {
                          await act.swap(item.choreId, week.weekStart, cp);
                          setSwapping(null);
                          toast(c.swapDone(who(cp), chore.name));
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </ListGroup>
          </Card>
          {error && <InlineMessage kind="error" text={error} />}
        </Section>
      )}

      {nextWeeks.length > 0 && (
        <Section title={c.next} subtitle={c.nextHint}>
          <Card style={{ gap: Spacing.md }}>
            {nextWeeks.map((w, i) => (
              <View key={w.weekStart} style={[styles.week, i > 0 && { borderTopColor: theme.line, ...styles.weekDivider }]}>
                <AppText variant="callout" color={theme.textSecondary}>
                  {c.weekOf(weekDate(w.weekStart, lang))}
                </AppText>
                {w.items
                  .filter((x) => choreById(data, x.choreId))
                  .map((x) => {
                    const chore = choreById(data, x.choreId)!;
                    const mine = x.assignee === data.me;
                    return (
                      <View key={x.choreId} style={styles.weekLine}>
                        <AppText style={{ flex: 1 }}>{chore.name}</AppText>
                        <AppText color={mine ? theme.text : theme.textSecondary} style={styles.weekWho}>
                          {who(x.assignee)}
                        </AppText>
                      </View>
                    );
                  })}
              </View>
            ))}
          </Card>
        </Section>
      )}

      <Section title={c.list} subtitle={c.listHint}>
        <Card style={styles.listCard}>
          <ListGroup>
            {data.chores.map((chore) => (
              <ChoreRow
                key={chore.id}
                emoji={chore.emoji}
                title={chore.name}
                subtitle={c.order(chore.rotation.map((cp) => who(cp)).join(' → '))}
                onPress={() => router.push(editHref(chore.id))}
              />
            ))}
          </ListGroup>
        </Card>
        <Button
          variant="secondary"
          label={c.add}
          icon={<Icon name="plus" size={17} color={theme.text} />}
          onPress={() => router.push(editHref())}
        />
      </Section>
    </>
  );
}

/** "Qui prend la tâche cette semaine ?": pick a roommate, then confirm. */
function SwapPanel({
  data,
  choreName,
  onSwap,
  onCancel,
}: {
  data: ChoresData;
  choreName: string;
  onSwap: (cp: string) => Promise<void>;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const c = t.chores;
  const roommates = data.members.filter((m) => m.id !== data.me);
  const [picked, setPicked] = useState<string | null>(roommates.length === 1 ? roommates[0].id : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = roommates.find((m) => m.id === picked)?.firstName;

  async function confirm() {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await onSwap(picked);
    } catch (e) {
      setError(choreErrorText(e, t, 'action'));
      setSaving(false);
    }
  }

  return (
    <View
      accessibilityLabel={`${c.swapTitle} ${choreName}`}
      style={[styles.swap, { borderTopColor: theme.line }]}>
      <FieldLabel>{c.swapTitle}</FieldLabel>
      <PersonPicker
        members={roommates}
        me={data.me}
        meLabel={c.you}
        selected={picked ? [picked] : []}
        onPress={setPicked}
      />
      {error && <InlineMessage kind="error" text={error} />}
      <View style={{ gap: Spacing.xs }}>
        {name && <Button variant="secondary" label={c.swapConfirm(name)} onPress={confirm} loading={saving} />}
        <Button variant="plain" label={c.swapCancel} onPress={onCancel} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  week: { gap: Spacing.xs },
  weekDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  weekLine: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  weekWho: { textAlign: 'right', maxWidth: '50%' },
  swap: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
