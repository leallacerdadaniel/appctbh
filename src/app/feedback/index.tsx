import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NewBadge } from '@/components/feedback-ui';
import { Icon } from '@/components/icon';
import { stampLabel } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { unreadReplies, useFeedback, useFeedbackActions, type FeedbackData, type FeedbackItem } from '@/lib/feedback';

/**
 * Mes avis (Séjour › Aide, and the bell when the team replies): what the student sent, newest first, with
 * the team's reply under each message. Replies are marked read once on screen; the "Nouveau" mark stays
 * until the student leaves the page.
 */
export default function FeedbackScreen() {
  const { t } = useI18n();
  const f = t.feedback;
  const { state, reload } = useFeedback();
  return (
    <Screen back title={f.title} subtitle={f.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={f.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && <Content data={state.data} />}
    </Screen>
  );
}

function Content({ data }: { data: FeedbackData }) {
  const theme = useTheme();
  const { t } = useI18n();
  const f = t.feedback;
  const { markRepliesRead } = useFeedbackActions();
  // Replies that were new when they reached the screen keep their mark for this visit.
  const [seenNew, setSeenNew] = useState<Set<string>>(() => new Set());
  const unread = unreadReplies(data).map((x) => x.id);
  if (unread.some((id) => !seenNew.has(id))) setSeenNew(new Set([...seenNew, ...unread]));
  const unreadKey = unread.join(',');

  // Everything unread is marked read as soon as it is on screen (also what arrives by pull-to-refresh).
  useEffect(() => {
    if (unreadKey) markRepliesRead(unreadKey.split(','));
  }, [unreadKey, markRepliesRead]);

  return (
    <>
      <Button
        label={f.give}
        icon={<Icon name="edit" size={17} color={theme.onBrand} />}
        onPress={() => router.push('/feedback/new' as Href)}
      />
      <Section title={f.listTitle}>
        {data.items.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{f.empty}</AppText>
          </Card>
        ) : (
          data.items.map((item) => <FeedbackCard key={item.id} item={item} isNew={seenNew.has(item.id)} />)
        )}
      </Section>
    </>
  );
}

function FeedbackCard({ item, isNew }: { item: FeedbackItem; isNew: boolean }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const f = t.feedback;
  return (
    <Card style={{ gap: Spacing.sm }}>
      <View style={styles.top}>
        <AppText style={{ flex: 1, fontFamily: Fonts.bodySemi }}>{f.topics[item.topic] ?? f.topics.general}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {f.sentOn(stampLabel(item.createdAt, lang))}
        </AppText>
      </View>
      <AppText>{item.body}</AppText>

      {item.reply ? (
        <View style={[styles.reply, { borderTopColor: theme.line }]}>
          <View style={styles.top}>
            <View style={[styles.replyIcon, { backgroundColor: theme.infoSoft }]}>
              <Icon name="feedback" size={15} color={theme.info} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="callout" style={{ fontFamily: Fonts.bodySemi }}>
                {f.reply}
              </AppText>
              {item.repliedAt && (
                <AppText variant="caption" color={theme.textSecondary}>
                  {stampLabel(item.repliedAt, lang)}
                </AppText>
              )}
            </View>
            {isNew && <NewBadge label={f.newReply} />}
          </View>
          <AppText>{item.reply}</AppText>
        </View>
      ) : (
        <View style={styles.status}>
          <Icon
            name={item.status === 'open' ? 'clock' : 'checkCircle'}
            size={15}
            color={item.status === 'open' ? theme.textSecondary : theme.success}
          />
          <AppText
            variant="caption"
            color={item.status === 'open' ? theme.textSecondary : theme.success}
            style={{ flex: 1 }}>
            {item.status === 'open' ? f.waiting : f.closed}
          </AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reply: { gap: Spacing.sm, paddingTop: 12, marginTop: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  replyIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
