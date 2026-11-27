import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { CharlotteFace } from '@/components/charlotte';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { enableLocation, locationPermission, useJournal } from '@/lib/journal';
import { useFinishPermissions } from '@/lib/permissions-intro';
import { pushPermission, requestPushPermission, type PushPermission } from '@/lib/push';

type LocationState = 'idle' | 'on' | 'denied' | 'blocked' | 'unavailable';

/**
 * First launch, right after the house rules (owner, 2026-11-27): notifications and location, each explained before
 * the system asks. The student can say no to both; "Continuer" closes the screen for good on this phone. Location
 * here is the same opt-in as "Ta carte de BH" in the recap (journal.ts): a yes turns the map on.
 */
export default function PermissionsIntroScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const p = t.permissionsIntro;
  const { email, journal } = useJournal();
  const finish = useFinishPermissions(email);
  const [notif, setNotif] = useState<PushPermission | 'idle' | null>(null);
  const [location, setLocation] = useState<LocationState | null>(Platform.OS === 'web' ? 'unavailable' : null);
  const [busy, setBusy] = useState<'notif' | 'location' | null>(null);

  // What the phone already allows (a student who answered before, on another version of the app).
  useEffect(() => {
    pushPermission()
      .then((s) => setNotif(s === 'granted' || s === 'unavailable' ? s : 'idle'))
      .catch(() => setNotif('unavailable'));
  }, []);
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    locationPermission()
      .then((s) => alive && setLocationAllowed(s === 'granted'))
      .catch(() => alive && setLocationAllowed(false));
    return () => {
      alive = false;
    };
  }, []);
  // Already on: the phone allows it and the recap map is on. Otherwise what the student answered here.
  const locationState: LocationState | null =
    location ?? (locationAllowed === null ? null : locationAllowed && journal.optIn ? 'on' : 'idle');

  async function askNotif() {
    setBusy('notif');
    try {
      setNotif(await requestPushPermission());
    } catch {
      setNotif('unavailable');
    } finally {
      setBusy(null);
    }
  }

  async function askLocation() {
    setBusy('location');
    try {
      const result = await enableLocation(email);
      setLocation(result === 'on' ? 'on' : result);
    } catch {
      setLocation('denied');
    } finally {
      setBusy(null);
    }
  }

  async function done() {
    await finish();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const anyOn = notif === 'granted' || locationState === 'on';

  return (
    <Screen
      bar="none"
      footer={<Button label={anyOn ? p.continue : p.later} variant={anyOn ? 'primary' : 'secondary'} onPress={done} />}>
      <View style={styles.head}>
        <CharlotteFace size={72} sparkle />
        <AppText variant="display" style={styles.center}>
          {p.title}
        </AppText>
        <AppText color={theme.textSecondary} style={styles.center}>
          {p.subtitle}
        </AppText>
      </View>

      <PermissionCard
        icon="bell"
        title={p.notifTitle}
        text={p.notifText}
        on={notif === 'granted'}
        onLabel={p.notifOn}
        note={notif === 'unavailable' ? p.notifUnavailable : notif === 'denied' || notif === 'blocked' ? p.notifOff : null}
        button={notif === 'idle' ? { label: p.notifButton, onPress: askNotif, loading: busy === 'notif' } : null}
        settings={notif === 'blocked' ? p.settings : null}
      />

      <PermissionCard
        icon="map"
        title={p.locationTitle}
        text={p.locationText}
        extra={t.recap.location.geocoder}
        on={locationState === 'on'}
        onLabel={p.locationOn}
        note={
          locationState === 'unavailable'
            ? p.locationWeb
            : locationState === 'denied' || locationState === 'blocked'
              ? p.locationOff
              : null
        }
        button={
          locationState === 'idle' ? { label: p.locationButton, onPress: askLocation, loading: busy === 'location' } : null
        }
        settings={locationState === 'blocked' ? p.settings : null}
      />
    </Screen>
  );
}

function PermissionCard({
  icon,
  title,
  text,
  extra,
  on,
  onLabel,
  note,
  button,
  settings,
}: {
  icon: IconName;
  title: string;
  text: string;
  extra?: string;
  on: boolean;
  onLabel: string;
  note: string | null;
  button: { label: string; onPress: () => void; loading: boolean } | null;
  settings: string | null;
}) {
  const theme = useTheme();
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.row}>
        <View style={[styles.circle, { backgroundColor: on ? theme.successSoft : theme.brandSoft }]}>
          <Icon name={on ? 'check' : icon} size={20} color={on ? theme.success : theme.brand} />
        </View>
        <AppText variant="title" style={{ flex: 1 }}>
          {title}
        </AppText>
      </View>
      <AppText>{text}</AppText>
      {extra ? (
        <AppText variant="callout" color={theme.textSecondary}>
          {extra}
        </AppText>
      ) : null}
      {on ? (
        <AppText color={theme.success} style={{ fontFamily: Fonts.bodySemi }}>
          {onLabel}
        </AppText>
      ) : null}
      {note ? (
        <AppText variant="callout" color={theme.textSecondary}>
          {note}
        </AppText>
      ) : null}
      {button ? <Button label={button.label} onPress={button.onPress} loading={button.loading} /> : null}
      {settings ? <Button variant="secondary" label={settings} onPress={() => Linking.openSettings()} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.lg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
