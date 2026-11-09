import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ChipWrap, FieldLabel } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  houseSocialErrorText,
  instagramHandle,
  LANGUAGE_CODES,
  languageName,
  useHouseSocialActions,
  useMyProfile,
  type SocialProfile,
} from '@/lib/house-social';

/**
 * "Mon profil pour les colocs" (opened from Profil and from the roommates page): school, home city,
 * languages, Instagram, one line. Roommates only see it once "Visible par mes colocataires" is on
 * (off by default: consent).
 */
export default function MyProfileScreen() {
  const { t } = useI18n();
  const p = t.houseSocial.profile;
  const { state, reload } = useMyProfile();
  return (
    <Screen back title={p.title} subtitle={p.subtitle}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={p.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && <Form profile={state.data.profile} />}
    </Screen>
  );
}

function Form({ profile }: { profile: SocialProfile | null }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.houseSocial.profile;
  const act = useHouseSocialActions();

  const [school, setSchool] = useState(profile?.school ?? '');
  const [hometown, setHometown] = useState(profile?.hometown ?? '');
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [instagram, setInstagram] = useState(profile?.instagram ? `@${profile.instagram}` : '');
  const [about, setAbout] = useState(profile?.about ?? '');
  const [visible, setVisible] = useState(profile?.visible ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A language saved earlier that isn't in the usual list stays selectable.
  const options = [...LANGUAGE_CODES, ...languages.filter((l) => !(LANGUAGE_CODES as readonly string[]).includes(l))];

  async function save() {
    setError(null);
    const handle = instagramHandle(instagram);
    if (handle === undefined) return setError(t.houseSocial.errors.instagram);
    setSaving(true);
    try {
      await act.saveProfile({
        school: school.trim() || null,
        hometown: hometown.trim() || null,
        languages,
        instagram: handle,
        about: about.trim() || null,
        visible,
      });
      toast(p.saved);
      router.back();
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'server'));
      setSaving(false);
    }
  }

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <Input
          label={p.school}
          placeholder={p.schoolPlaceholder}
          value={school}
          onChangeText={setSchool}
          maxLength={80}
          autoCapitalize="words"
        />
        <Input
          label={p.hometown}
          placeholder={p.hometownPlaceholder}
          value={hometown}
          onChangeText={setHometown}
          maxLength={80}
          autoCapitalize="words"
        />
        <Input
          label={p.about}
          placeholder={p.aboutPlaceholder}
          value={about}
          onChangeText={setAbout}
          maxLength={140}
          autoCapitalize="sentences"
        />
        <Input
          label={p.instagram}
          placeholder={p.instagramPlaceholder}
          value={instagram}
          onChangeText={setInstagram}
          maxLength={60}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <FieldLabel hint={p.languagesHint}>{p.languages}</FieldLabel>
        <ChipWrap>
          {options.map((code) => {
            const on = languages.includes(code);
            return (
              <Chip
                key={code}
                label={languageName(code, t)}
                selected={on}
                onPress={() => setLanguages((l) => (on ? l.filter((x) => x !== code) : [...l, code].slice(0, 8)))}
              />
            );
          })}
        </ChipWrap>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: visible }}
          accessibilityLabel={p.visibility}
          onPress={() => setVisible((x) => !x)}
          style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: Fonts.bodySemi }}>{p.visibility}</AppText>
            <AppText variant="caption" color={theme.textSecondary}>
              {`${visible ? p.visibleHint : p.hiddenHint} ${p.teamNote}`}
            </AppText>
          </View>
          <Switch
            value={visible}
            onValueChange={setVisible}
            trackColor={{ false: theme.track, true: theme.success }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <Button label={p.save} onPress={save} loading={saving} disabled={saving} />
    </>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: TapTarget },
});
