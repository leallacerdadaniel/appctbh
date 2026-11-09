import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, StepNumber } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { communityError, useCommunity, useCommunityActions, type CommunityStatus } from '@/lib/community';

/**
 * The community guidelines. Accepting them once (per version) is required before posting (App Store 1.2:
 * terms for user-generated content, filtering, reporting and blocking). `next`: where to go after accepting.
 */
export default function CharterScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community.charter;
  const { next } = useLocalSearchParams<{ next?: string }>();
  const status = useCommunity<CommunityStatus>('status');
  const act = useCommunityActions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = status.state.status === 'ready' && status.state.data.termsAccepted;

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      await act.acceptTerms(lang);
      if (next?.startsWith('/community')) router.replace(next as Href);
      else router.back();
    } catch (e) {
      setError(communityError(e, t));
      setSaving(false);
    }
  }

  return (
    <Screen back title={c.title} subtitle={c.intro}>
      <Card style={{ gap: Spacing.lg }}>
        {c.rules.map((rule, i) => (
          <View key={rule.title} style={styles.rule}>
            <StepNumber n={i + 1} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: Fonts.bodyMedium }}>{rule.title}</AppText>
              <AppText color={theme.textSecondary}>{rule.body}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <Notice icon="shield" text={c.moderation} />
      {error && <InlineMessage kind="error" text={error} />}
      {accepted ? (
        <InlineMessage kind="success" text={c.accepted} />
      ) : (
        <Button
          label={c.accept}
          onPress={accept}
          loading={saving}
          disabled={status.state.status !== 'ready'}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
