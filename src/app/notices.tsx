import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card, LoadingState, RetryCard, tapFeedback } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { noticeText, useNotices, type Notice } from '@/lib/notices';

/**
 * The bell's page: the team's notices, newest first. Opening it marks them all read; the ones that
 * were new keep their dot until the student leaves the page.
 */
export default function NoticesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { state, reload, markRead, justRead, forgetJustRead } = useNotices();
  // Everything unread is marked read as soon as it is on screen (also what arrives by pull-to-refresh).
  const unreadKey = state.status === 'ready' ? state.notices.filter((n) => !n.read).map((n) => n.id).join(',') : '';

  useEffect(() => {
    if (unreadKey) markRead(unreadKey.split(','));
  }, [unreadKey, markRead]);

  // The "new" dots last for this visit only.
  useEffect(() => forgetJustRead, [forgetJustRead]);

  return (
    <Screen back title={t.notices.title} subtitle={t.notices.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && (
        <RetryCard message={t.notices.unavailable} retryLabel={t.common.retry} onRetry={reload} />
      )}
      {state.status === 'ready' &&
        (state.notices.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{t.notices.empty}</AppText>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            <ListGroup>
              {state.notices.map((n) => (
                <NoticeRow key={n.id} notice={n} isNew={!n.read || justRead.has(n.id)} />
              ))}
            </ListGroup>
          </Card>
        ))}
    </Screen>
  );
}

function NoticeRow({ notice, isNew }: { notice: Notice; isNew: boolean }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const title = noticeText(notice.title, lang);
  const body = noticeText(notice.body, lang);
  const when = relativeTime(notice.at, t, lang);
  const href = notice.href?.trim() || null;

  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { opacity: 0.55 }]}>
      <View style={styles.dotSlot}>
        {isNew && <View style={[styles.dot, { backgroundColor: theme.text }]} />}
      </View>
      <View style={styles.text}>
        <AppText style={isNew ? { fontFamily: Fonts.bodyMedium } : undefined}>{title}</AppText>
        {body ? (
          <AppText variant="callout" color={theme.textSecondary}>
            {body}
          </AppText>
        ) : null}
        <AppText variant="caption" color={theme.textSecondary}>
          {when}
        </AppText>
      </View>
      {href && <Icon name="chevronRight" size={15} color={theme.textTertiary} />}
    </View>
  );

  const label = [isNew && t.notices.unread, title, body, when].filter(Boolean).join(', ');
  if (!href) {
    return (
      <View accessible accessibilityLabel={label}>
        {content(false)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        if (/^https?:\/\//i.test(href)) Linking.openURL(href);
        else router.push(href as Href);
      }}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

/** "À l’instant", "Il y a 5 min", "Il y a 3 h", "Hier", "Il y a 4 jours", then the date. */
function relativeTime(at: string, t: Strings, lang: Lang) {
  const then = new Date(at);
  const minutes = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60_000));
  if (minutes < 1) return t.notices.now;
  if (minutes < 60) return t.notices.minutes(minutes);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days === 0) return t.notices.hours(Math.floor(minutes / 60));
  if (days === 1) return t.notices.yesterday;
  if (days < 7) return t.notices.days(days);
  return then.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 56, paddingVertical: 14 },
  dotSlot: { width: 8, alignSelf: 'flex-start', paddingTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, gap: 2 },
});
