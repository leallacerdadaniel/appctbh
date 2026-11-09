import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_WINE, AuthBackdrop, AuthField, GradientButton, OutlineButton } from '@/components/auth-ui';
import { FocusStatusBar } from '@/components/focus-status-bar';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Notice } from '@/components/request-ui';
import { AppText, InlineMessage, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Shadow, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatTime } from '@/lib/format';
import { hasLink } from '@/lib/no-links';
import { openWhatsApp } from '@/lib/whatsapp';

type Profile = {
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  apartment: string | null;
  stayStart: string | null;
  stayEnd: string | null;
  arrival: { date: string | null; time: string | null; flight: string | null };
  emergency: { name: string | null; contact: string | null }[];
};
type Verified = { ticket: string; alreadyActive: boolean; profile: Profile };
type Step = 'identity' | 'profile' | 'password';
type FirstAccessError =
  | 'invalid'
  | 'noMatch'
  | 'tooMany'
  | 'hasAccount'
  | 'disabled'
  | 'expired'
  | 'tooShort'
  | 'links'
  | 'accessEnded'
  | 'network'
  | 'server';

const KNOWN: FirstAccessError[] = [
  'invalid',
  'noMatch',
  'tooMany',
  'hasAccount',
  'disabled',
  'expired',
  'tooShort',
  'links',
  'accessEnded',
  'network',
];
const toError = (e: unknown): FirstAccessError | 'incomplete' =>
  e instanceof AppApiError && e.code === 'incomplete'
    ? 'incomplete'
    : e instanceof AppApiError && (KNOWN as string[]).includes(e.code)
      ? (e.code as FirstAccessError)
      : 'server';

const STEPS: Step[] = ['identity', 'profile', 'password'];
const MIN_LENGTH = 8;

/** "05/03/2004" → "2004-03-05"; null when it isn't a real date. */
function isoFromTyped(typed: string) {
  const m = typed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Digits only, with the slashes added while typing: "0503" → "05/03". */
function maskDate(input: string) {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

/**
 * First access linked to the student's Chez Toi form (owner, 2026-11-09). The student proves who they are with the
 * date of birth and passport number on the form, checks what the form says (a correction goes to the team, never
 * into the site's database), then chooses a password and is signed in. Only for accounts without a password yet
 * (security review, 2026-11-09): someone who already has one gets 'hasAccount' and the way to "forgot password".
 */
export default function FirstAccessScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const f = t.firstAccess;
  const { signInWithToken } = useAuth();

  const [step, setStep] = useState<Step>('identity');
  const [email, setEmail] = useState('');
  const [birth, setBirth] = useState('');
  const [passport, setPassport] = useState('');
  const [verified, setVerified] = useState<Verified | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<FirstAccessError | null>(null);
  const [incomplete, setIncomplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const rules = [
    { label: t.changePassword.ruleLength(MIN_LENGTH), ok: password.length >= MIN_LENGTH },
    { label: t.changePassword.ruleDigit, ok: /\d/.test(password) },
  ];
  const mismatch = confirm.length > 0 && confirm !== password;
  const stepIndex = STEPS.indexOf(step);

  async function verify() {
    setError(null);
    setIncomplete(false);
    const birthDate = isoFromTyped(birth);
    if (!email.trim().includes('@') || !birthDate || passport.trim().length < 5) return setError('invalid');
    setLoading(true);
    try {
      const r = await appApi<Verified>('first-access-verify', {
        body: { email: email.trim(), birthDate, passport: passport.trim() },
      });
      setVerified(r);
      setStep('profile');
    } catch (e) {
      const code = toError(e);
      if (code === 'incomplete') setIncomplete(true);
      else setError(code);
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    if (!verified) return;
    setError(null);
    if (!rules.every((r) => r.ok)) return setError('tooShort');
    if (hasLink(correction)) return setError('links');
    setLoading(true);
    try {
      const r = await appApi<{ token: string }>('first-access-complete', {
        body: { ticket: verified.ticket, password, correction: correcting ? correction.trim() : '' },
      });
      // Signed in: the layout's guard swaps this screen for the house rules and the tabs.
      signInWithToken(r.token);
    } catch (e) {
      const code = toError(e);
      setError(code === 'incomplete' ? 'server' : code);
      // hasAccount: the account got a password meanwhile; the first step shows the way to "forgot password".
      if (code === 'expired' || code === 'hasAccount') setStep('identity');
      setLoading(false);
    }
  }

  function back() {
    setError(null);
    if (step === 'identity') router.back();
    else setStep(STEPS[stepIndex - 1]);
  }

  const titles: Record<Step, [string, string]> = {
    identity: [f.identityTitle, f.identityHint],
    profile: [f.profileTitle, f.profileHint],
    password: [f.passwordTitle, f.passwordHint],
  };
  const whatsapp = () => openWhatsApp('first_access', f.whatsappMessage(email.trim()));
  const value = (v: string | null | undefined) => (v && v.trim() ? v : f.missing);

  return (
    <View style={styles.root}>
      <FocusStatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.hero}>
            <AuthBackdrop />
            <View style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.common.back}
                onPress={back}
                hitSlop={4}
                style={[styles.back, { backgroundColor: theme.onBrandTrack }]}>
                <Icon name="chevronLeft" size={20} color={theme.onBrand} />
              </PressableScale>
              <View style={styles.dots}>
                {STEPS.map((s, i) => (
                  <View
                    key={s}
                    style={[
                      styles.dot,
                      { backgroundColor: i <= stepIndex ? theme.onBrand : theme.onBrandTrack, width: i === stepIndex ? 22 : 8 },
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.welcome}>
              <AppText color={theme.onBrandMuted} style={{ fontFamily: Fonts.bodyMedium }}>
                {f.title} · {f.stepOf(stepIndex + 1, STEPS.length)}
              </AppText>
              <AppText color={theme.onBrand} style={styles.title}>
                {titles[step][0]}
              </AppText>
              <AppText color={theme.onBrandMuted}>{titles[step][1]}</AppText>
            </View>
          </View>

          <View
            style={[styles.sheet, Shadow.floating, { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
            {step === 'identity' && (
              <>
                <AuthField
                  label={t.login.email}
                  icon="mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.login.emailPlaceholder}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                <AuthField
                  label={f.birthDate}
                  icon="calendar"
                  value={birth}
                  onChangeText={(v) => setBirth(maskDate(v))}
                  placeholder={f.birthPlaceholder}
                  keyboardType="number-pad"
                  autoComplete="birthdate-full"
                  maxLength={10}
                />
                <AuthField
                  label={f.passport}
                  icon="idCard"
                  value={passport}
                  onChangeText={setPassport}
                  placeholder={f.passportPlaceholder}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={verify}
                />
                {incomplete && <InlineMessage kind="success" text={f.incomplete} />}
                {error && <InlineMessage kind="error" text={f.errors[error]} />}
                <GradientButton
                  label={f.continue}
                  onPress={verify}
                  loading={loading}
                  disabled={!email.trim() || birth.length < 10 || !passport.trim()}
                />
                {error === 'hasAccount' && (
                  <OutlineButton icon="key" label={t.login.forgot} onPress={() => router.replace('/forgot-password')} />
                )}
                {(error === 'noMatch' || error === 'tooMany' || error === 'disabled' || incomplete) && (
                  <OutlineButton icon="whatsapp" label={t.forgotPassword.whatsapp} onPress={whatsapp} />
                )}
              </>
            )}

            {step === 'profile' && verified && (
              <>
                {verified.alreadyActive && <Notice icon="key" text={f.alreadyActive} />}
                <View style={[styles.infoCard, { borderColor: theme.line }]}>
                  <ListGroup inset>
                    <ListRow icon="profile" title={f.fields.name} subtitle={value(verified.profile.name)} />
                    <ListRow icon="mail" title={f.fields.email} subtitle={value(verified.profile.email)} />
                    <ListRow icon="phone" title={f.fields.phone} subtitle={value(verified.profile.phone)} />
                    <ListRow icon="website" title={f.fields.nationality} subtitle={value(verified.profile.nationality)} />
                    <ListRow icon="apartment" title={f.fields.apartment} subtitle={value(verified.profile.apartment)} />
                    <ListRow
                      icon="calendar"
                      title={f.fields.stay}
                      subtitle={
                        verified.profile.stayStart && verified.profile.stayEnd
                          ? f.stay(formatDate(verified.profile.stayStart, lang), formatDate(verified.profile.stayEnd, lang))
                          : f.missing
                      }
                    />
                    <ListRow
                      icon="travel"
                      title={f.fields.arrival}
                      subtitle={
                        verified.profile.arrival.date
                          ? [
                              formatDate(verified.profile.arrival.date, lang),
                              verified.profile.arrival.time ? formatTime(verified.profile.arrival.time, lang) : null,
                              verified.profile.arrival.flight ? f.flight(verified.profile.arrival.flight) : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : f.missing
                      }
                    />
                    {(verified.profile.emergency.length ? verified.profile.emergency : [{ name: null, contact: null }]).map(
                      (c, i) => (
                        <ListRow
                          key={i}
                          icon="emergency"
                          title={f.fields.emergency}
                          subtitle={c.name || c.contact ? [c.name, c.contact].filter(Boolean).join(' · ') : f.missing}
                        />
                      ),
                    )}
                  </ListGroup>
                </View>
                {correcting && (
                  <>
                    <AuthField
                      label={f.correctionLabel}
                      icon="edit"
                      value={correction}
                      onChangeText={setCorrection}
                      placeholder={f.correctionPlaceholder}
                      multiline
                      maxLength={1000}
                      style={{ paddingTop: 0 }}
                    />
                    <AppText variant="caption" color={theme.textSecondary}>
                      {f.correctionNote}
                    </AppText>
                  </>
                )}
                {error && <InlineMessage kind="error" text={f.errors[error]} />}
                <GradientButton
                  label={correcting ? f.continue : f.confirm}
                  onPress={() => {
                    if (correcting && hasLink(correction)) return setError('links');
                    setError(null);
                    setStep('password');
                  }}
                  disabled={correcting && !correction.trim()}
                />
                {!correcting && <OutlineButton icon="edit" label={f.correct} onPress={() => setCorrecting(true)} />}
              </>
            )}

            {step === 'password' && (
              <>
                <AuthField
                  label={t.changePassword.newPassword}
                  icon="lock"
                  secure
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="new-password"
                />
                <View style={{ gap: Spacing.xs }}>
                  {rules.map((r) => (
                    <View key={r.label} style={styles.rule}>
                      <View style={[styles.ruleDot, { backgroundColor: r.ok ? theme.success : theme.line }]}>
                        {r.ok && <Icon name="check" size={11} color={theme.surface} />}
                      </View>
                      <AppText variant="caption" color={r.ok ? theme.text : theme.textSecondary}>
                        {r.label}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AuthField
                  label={t.changePassword.confirm}
                  icon="lock"
                  secure
                  value={confirm}
                  onChangeText={setConfirm}
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={complete}
                />
                {mismatch && <InlineMessage kind="error" text={t.changePassword.mismatch} />}
                {error && <InlineMessage kind="error" text={f.errors[error]} />}
                <GradientButton
                  label={f.create}
                  onPress={complete}
                  loading={loading}
                  disabled={!rules.every((r) => r.ok) || confirm !== password}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const SHEET_RADIUS = 32;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH_WINE },
  hero: { minHeight: 300, overflow: 'hidden', justifyContent: 'space-between', paddingBottom: SHEET_RADIUS + Spacing.lg },
  top: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  welcome: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xxl,
    gap: Spacing.xs,
  },
  title: { ...Type.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  sheet: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    marginTop: -SHEET_RADIUS,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  infoCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
