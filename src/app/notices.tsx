import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card, tapFeedback } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import { markNoticesRead } from '@/store/actions';
import { isoDate } from '@/store/dates';
import { useStore } from '@/store/index';
import type { Notice } from '@/store/types';

/** The bell inbox: team messages and request updates, newest first. Opening it marks all read. */
export default function NoticesScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const notices = useStore((s) => [...s.notices].sort((a, b) => b.at.localeCompare(a.at)));
  const unreadCount = notices.filter((n) => !n.read).length;

  // What was unread when the screen opened keeps its dot after being marked read.
  const [unreadAtOpen] = useState(() => new Set(notices.filter((n) => !n.read).map((n) => n.id)));

  useEffect(() => {
    if (unreadCount > 0) markNoticesRead();
  }, [unreadCount]);

  return (
    <Screen back title={t.reminders.noticesTitle} subtitle={t.reminders.noticesSubtitle}>
      {notices.length === 0 ? (
        <Card style={styles.empty}>
          <Icon name="bell" size={28} color={theme.textTertiary} />
          <AppText style={styles.center}>{t.reminders.noticesEmpty}</AppText>
          <AppText variant="callout" color={theme.textSecondary} style={styles.center}>
            {t.reminders.noticesEmptyHint}
          </AppText>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          <ListGroup>
            {notices.map((n) => (
              <NoticeRow key={n.id} notice={n} unread={!n.read || unreadAtOpen.has(n.id)} lang={lang} />
            ))}
          </ListGroup>
        </Card>
      )}
    </Screen>
  );
}

function NoticeRow({ notice, unread, lang }: { notice: Notice; unread: boolean; lang: Lang }) {
  const theme = useTheme();
  const { t } = useI18n();
  const when = relativeDate(notice.at, lang, t.reminders.ago);

  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { opacity: 0.55 }]}>
      <View style={styles.dotColumn}>
        {unread && (
          <View
            accessibilityLabel={t.reminders.unread}
            style={[styles.dot, { backgroundColor: theme.brand }]}
          />
        )}
      </View>
      <View style={styles.text}>
        <AppText>{notice.title[lang]}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {notice.body[lang]}
        </AppText>
        <AppText variant="caption" color={theme.textTertiary}>
          {when}
        </AppText>
      </View>
      {notice.href && <Icon name="chevronRight" size={15} color={theme.textTertiary} />}
    </View>
  );

  if (!notice.href) return content(false);
  const href = notice.href;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tapFeedback();
        router.push(href as Href);
      }}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

type Ago = {
  now: string;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  yesterday: string;
  days: (n: number) => string;
};

function relativeDate(at: string, lang: Lang, ago: Ago, now = new Date()) {
  const date = new Date(at);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return ago.now;
  if (minutes < 60) return ago.minutes(minutes);
  const sameDay = isoDate(date) === isoDate(now);
  if (sameDay) return ago.hours(Math.floor(minutes / 60));
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfToday - startOfThat) / 86_400_000);
  if (days === 1) return ago.yesterday;
  if (days < 7) return ago.days(days);
  return formatShortDate(isoDate(date), lang);
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, minHeight: 56, paddingVertical: 14 },
  dotColumn: { width: 8, paddingTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, gap: 2 },
});
