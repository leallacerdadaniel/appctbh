import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip, InlineMessage, Input, PressableScale } from '@/components/ui';
import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { disableCalendar, syncCalendar, type CalendarSyncResult } from '@/lib/calendar-sync';
import { formatTime } from '@/lib/format';
import {
  getNotificationPermission,
  notificationIdOf,
  plannedReminders,
  requestNotificationPermission,
  syncLocalNotifications,
  type NotificationPermission,
  type PlannedReminder,
} from '@/lib/reminders';
import { setCalendarSync, setPersonalReminders, setReminderPrefs } from '@/store/actions';
import { addDays, atTime, isoDate } from '@/store/dates';
import { getState, newId, useStore } from '@/store/index';
import type { CalendarSync, PersonalReminder, ReminderTopic } from '@/store/types';

const TOPICS: ReminderTopic[] = ['rent', 'cleaning', 'requests', 'checkout', 'documents', 'chores'];
const CALENDAR_TOPICS: (keyof CalendarSync['topics'])[] = ['rent', 'cleaning', 'requests', 'checkout', 'chores'];
const TOPIC_ICONS: Record<PlannedReminder['topic'], IconName> = {
  rent: 'rent',
  cleaning: 'cleaning',
  requests: 'calendarCheck',
  checkout: 'luggage',
  documents: 'document',
  chores: 'taskDone',
  personal: 'bell',
};
const TIMES = ['08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];
const DAYS_AHEAD = 7;
const UPCOMING_LIMIT = 8;

/** "jeu. 12 nov. · 19h00" (fr) · "Thu, Nov 12 · 7:00 PM" (en) */
function whenLabel(d: Date, lang: Lang) {
  const day = d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${day} · ${formatTime(hhmm, lang)}`;
}

function TopicSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const theme = useTheme();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: theme.fill, true: theme.brand }}
      ios_backgroundColor={theme.fill}
      thumbColor={Platform.OS === 'android' ? theme.surface : undefined}
    />
  );
}

/** "Rappels et agenda": notification topics, phone calendar sync, upcoming and personal reminders. */
export default function RemindersScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const r = t.reminders;

  const prefs = useStore((s) => s.reminderPrefs);
  const calendar = useStore((s) => s.calendarSync);
  const personal = useStore((s) => s.personalReminders);
  const upcoming = useStore((s) => plannedReminders(s, lang).slice(0, UPCOMING_LIMIT));

  /* ---------- Notification permission ---------- */

  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    const refresh = () => getNotificationPermission().then(setPermission);
    refresh();
    // Coming back from the phone settings.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  async function allow(): Promise<NotificationPermission> {
    const next = await requestNotificationPermission(lang);
    setPermission(next);
    if (next === 'granted') {
      await syncLocalNotifications(plannedReminders(getState(), lang), lang).catch(() => 0);
    }
    return next;
  }

  const permissionText =
    permission === 'granted'
      ? r.permissionGranted
      : permission === 'denied'
        ? r.permissionDenied
        : permission === 'unavailable'
          ? r.permissionUnavailable
          : r.permissionUndetermined;

  /* ---------- Calendar ---------- */

  const [syncing, setSyncing] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  function explain(result: CalendarSyncResult) {
    if (result.ok) {
      setCalendarError(null);
      toast(r.synced(result.count));
    } else {
      setCalendarError(r.calendarErrors[result.reason]);
    }
  }

  async function syncNow() {
    setSyncing(true);
    const result = await syncCalendar(getState(), lang);
    setSyncing(false);
    explain(result);
    return result;
  }

  async function toggleCalendar(on: boolean) {
    if (on) {
      setCalendarSync({ enabled: true });
      const result = await syncNow();
      if (!result.ok) setCalendarSync({ enabled: false });
    } else {
      setCalendarError(null);
      await disableCalendar();
      toast(r.calendarRemoved);
    }
  }

  const lastSync = calendar.lastSyncAt ? r.lastSync(whenLabel(new Date(calendar.lastSyncAt), lang)) : r.neverSynced;

  /* ---------- Personal reminders ---------- */

  const today = new Date();
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => isoDate(addDays(today, i)));
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(days[1]);
  const [time, setTime] = useState('09:00');
  const [adding, setAdding] = useState(false);

  const dayLabel = (iso: string, i: number) => {
    if (i === 0) return r.today;
    if (i === 1) return r.tomorrow;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
    });
  };

  const now = today.getTime();
  const myReminders = personal
    .filter((p) => new Date(p.at).getTime() > now)
    .sort((a, b) => a.at.localeCompare(b.at));

  async function addPersonal() {
    const text = title.trim();
    if (!text) return;
    const at = atTime(day, time);
    if (at.getTime() <= new Date().getTime()) {
      toast(r.personalPast);
      return;
    }
    setAdding(true);
    const id = newId('personal');
    const item: PersonalReminder = {
      id,
      title: text,
      at: at.toISOString(),
      notificationId: notificationIdOf(`personal-${id}`),
    };
    // Past ones are dropped; the ReminderEngine schedules the new one.
    setPersonalReminders([...myReminders, item]);
    setTitle('');
    const granted = permission === 'granted' || (await allow()) === 'granted';
    setAdding(false);
    toast(granted ? r.personalAdded : r.personalNeedsPermission);
  }

  function deletePersonal(id: string) {
    setPersonalReminders(myReminders.filter((p) => p.id !== id));
  }

  return (
    <Screen back title={r.title} subtitle={r.subtitle}>
      <Section title={r.permissionTitle}>
        <Card style={styles.gap}>
          <View style={styles.statusRow}>
            <Icon
              name={permission === 'granted' ? 'bellActive' : permission === 'denied' ? 'warning' : 'bell'}
              size={20}
              color={permission === 'denied' ? theme.warning : theme.brand}
            />
            <AppText style={{ flex: 1 }}>{permissionText}</AppText>
          </View>
          {permission === 'undetermined' && <Button label={r.allow} onPress={allow} />}
          {permission === 'denied' && (
            <Button variant="secondary" label={r.openSettings} onPress={() => Linking.openSettings()} />
          )}
        </Card>
      </Section>

      <Section title={r.topicsTitle} subtitle={r.topicsSubtitle}>
        <Card style={{ paddingVertical: 0 }}>
          <ListGroup inset>
            {TOPICS.map((topic) => (
              <ListRow
                key={topic}
                icon={TOPIC_ICONS[topic]}
                title={r.topics[topic]}
                subtitle={r.topicHints[topic]}
                accessory={
                  <TopicSwitch
                    label={r.topics[topic]}
                    value={prefs[topic]}
                    onChange={(v) => setReminderPrefs({ [topic]: v })}
                  />
                }
              />
            ))}
          </ListGroup>
        </Card>
      </Section>

      <Section title={r.calendarTitle} subtitle={r.calendarSubtitle}>
        <Card style={{ paddingVertical: 0 }}>
          <ListGroup inset>
            <ListRow
              icon="calendarRepeat"
              title={r.calendarToggle}
              subtitle={calendar.enabled ? lastSync : undefined}
              accessory={<TopicSwitch label={r.calendarToggle} value={calendar.enabled} onChange={toggleCalendar} />}
            />
            {calendar.enabled &&
              CALENDAR_TOPICS.map((topic) => (
                <ListRow
                  key={topic}
                  icon={TOPIC_ICONS[topic]}
                  title={r.calendarTopics[topic]}
                  accessory={
                    <TopicSwitch
                      label={r.calendarTopics[topic]}
                      value={calendar.topics[topic]}
                      onChange={(v) => setCalendarSync({ topics: { ...calendar.topics, [topic]: v } })}
                    />
                  }
                />
              ))}
          </ListGroup>
          {calendar.enabled && (
            <View style={styles.cardFooter}>
              <Button
                variant="secondary"
                label={r.syncNow}
                loading={syncing}
                onPress={syncNow}
                icon={<Icon name="sync" size={18} color={theme.text} />}
              />
            </View>
          )}
        </Card>
        {calendarError && <InlineMessage kind="error" text={calendarError} />}
      </Section>

      <Section title={r.upcomingTitle} subtitle={r.upcomingSubtitle}>
        <Card style={{ paddingVertical: upcoming.length ? 0 : Spacing.md }}>
          {upcoming.length === 0 ? (
            <AppText color={theme.textSecondary}>{r.upcomingEmpty}</AppText>
          ) : (
            <ListGroup inset>
              {upcoming.map((item) => (
                <ListRow
                  key={item.key}
                  icon={TOPIC_ICONS[item.topic]}
                  title={item.title}
                  subtitle={whenLabel(item.at, lang)}
                />
              ))}
            </ListGroup>
          )}
        </Card>
      </Section>

      <Section title={r.personalTitle} subtitle={r.personalSubtitle}>
        {myReminders.length > 0 && (
          <Card style={{ paddingVertical: 0 }}>
            <ListGroup inset>
              {myReminders.map((p) => (
                <ListRow
                  key={p.id}
                  icon="bell"
                  title={p.title}
                  subtitle={whenLabel(new Date(p.at), lang)}
                  accessory={
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={r.personalDelete(p.title)}
                      onPress={() => deletePersonal(p.id)}
                      style={styles.iconButton}>
                      <Icon name="trash" size={20} color={theme.textSecondary} />
                    </PressableScale>
                  }
                />
              ))}
            </ListGroup>
          </Card>
        )}

        <Card style={styles.gap}>
          <Input
            label={r.personalLabel}
            placeholder={r.personalPlaceholder}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            maxLength={120}
          />
          <View style={styles.field}>
            <AppText variant="caption" color={theme.textSecondary}>
              {r.personalDay}
            </AppText>
            <View style={styles.chips}>
              {days.map((iso, i) => (
                <Chip key={iso} label={dayLabel(iso, i)} selected={day === iso} onPress={() => setDay(iso)} />
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <AppText variant="caption" color={theme.textSecondary}>
              {r.personalTime}
            </AppText>
            <View style={styles.chips}>
              {TIMES.map((hhmm) => (
                <Chip key={hhmm} label={formatTime(hhmm, lang)} selected={time === hhmm} onPress={() => setTime(hhmm)} />
              ))}
            </View>
          </View>
          <Button
            variant="secondary"
            label={r.personalAdd}
            disabled={!title.trim()}
            loading={adding}
            onPress={addPersonal}
            icon={<Icon name="plus" size={18} color={theme.text} />}
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: TapTarget },
  cardFooter: { paddingBottom: Spacing.md },
  field: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconButton: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center' },
});
