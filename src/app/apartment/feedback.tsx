import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input, tapFeedback } from '@/components/ui';
import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { canRate, formatLongDate } from '@/lib/cleaning';
import { useHome, useHomeState } from '@/lib/home';

/** Rating (1–5) + optional comment for one done cleaning, open for 7 days. One per student. */
export default function CleaningFeedbackScreen() {
  const { t, lang } = useI18n();
  const c = t.apartment.cleaning;
  const theme = useTheme();
  const toast = useToast();
  const { token } = useAuth();
  const { refresh } = useHomeState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visit = useHome().cleanings.find((v) => v.id === id);

  const [rating, setRating] = useState(visit?.feedback?.rating ?? 0);
  const [comment, setComment] = useState(visit?.feedback?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = !!visit && canRate(visit);

  async function send() {
    setError(null);
    if (!rating) return setError(c.errors.rating);
    setSaving(true);
    try {
      await appApi('cleaning-feedback', { token, body: { cleaningId: id, rating, comment: comment.trim() } });
      refresh();
      toast(c.saved);
      router.back();
    } catch (e) {
      setError(e instanceof AppApiError && e.code === 'forbidden' ? c.errors.closed : c.errors.server);
      setSaving(false);
    }
  }

  return (
    <Screen back title={c.feedbackTitle} subtitle={c.feedbackIntro}>
      {visit && (
        <Card style={{ gap: Spacing.lg }}>
          <AppText variant="title">{capitalize(formatLongDate(visit.date, lang))}</AppText>

          <View style={{ gap: Spacing.xs }}>
            <AppText variant="caption" color={theme.textSecondary}>
              {c.ratingLabel}
            </AppText>
            <View style={styles.stars} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  disabled={!open}
                  accessibilityRole="radio"
                  accessibilityLabel={c.stars(n)}
                  accessibilityState={{ checked: rating === n }}
                  onPress={() => {
                    tapFeedback();
                    setRating(n);
                  }}
                  style={styles.star}>
                  <Icon name="star" size={32} color={n <= rating ? theme.brand : theme.line} />
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label={c.commentLabel}
            placeholder={c.commentPlaceholder}
            value={comment}
            onChangeText={setComment}
            editable={open}
            multiline
            maxLength={500}
            style={styles.comment}
          />

          {open && visit.feedbackUntil && (
            <AppText variant="caption" color={theme.textSecondary}>
              {c.editableUntil(formatLongDate(visit.feedbackUntil, lang))}
            </AppText>
          )}
        </Card>
      )}

      {(error || !open) && <InlineMessage kind="error" text={error ?? c.errors.closed} />}
      {open && <Button label={c.send} onPress={send} loading={saving} />}
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', marginLeft: -6 },
  star: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center' },
  comment: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
});
