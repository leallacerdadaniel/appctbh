import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list';
import { Notice } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, StepNumber } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { communityError, useCommunity, useCommunityActions, type CommunityStatus } from '@/lib/community';
import { openPrivacyPolicy } from '@/lib/legal';
import { textParam } from '@/lib/params';

/**
 * The community guidelines. Accepting them once (per version) is required before posting (App Store 1.2:
 * terms for user-generated content, filtering, reporting and blocking). `next`: where to go after accepting.
 * The AI paragraph (2026-11-10) says in plain words who checks first (Claude, by Anthropic) and links to the
 * privacy policy; it informs and adds no rule, so `COMMUNITY_TERMS_VERSION` stays the same.
 */
export default function CharterScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.community.charter;
  // A link can repeat `next` (it then arrives as a list): only plain text is read.
  const next = textParam(useLocalSearchParams<{ next?: string }>().next);
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
      if (next.startsWith('/community')) router.replace(next as Href);
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
      <Card style={styles.ai}>
        <AppText>{c.ai}</AppText>
        <ListRow
          icon="shieldLock"
          title={t.common.privacyPolicy}
          subtitle={t.common.privacyHint}
          onPress={() => openPrivacyPolicy(lang)}
        />
      </Card>
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
  ai: { gap: Spacing.xs, paddingBottom: Spacing.xs },
});
