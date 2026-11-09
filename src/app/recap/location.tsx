import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card, InlineMessage } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { enableLocation, locationPermission, useJournal } from '@/lib/journal';
import { thisMonth } from '@/lib/recap';

/**
 * "Ta carte de BH": the opt-in for the location journal. It says exactly what is kept and where, asks the
 * system for "while using the app" only when the student taps the button, and can pause or erase it all.
 * Without it, the recaps still use "J'y suis allé", the photos and Portuguese.
 */
export default function RecapLocationScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const l = t.recap.location;
  const { email, journal, pauseLocation, eraseLocation } = useJournal();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<'denied' | 'blocked' | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erased, setErased] = useState(false);
  const web = Platform.OS === 'web';

  // Once opted in, show if the permission was taken back in the phone's settings.
  useFocusEffect(
    useCallback(() => {
      if (!journal.optIn || web) return;
      let alive = true;
      locationPermission()
        .then((p) => alive && setDenied(p === 'granted' ? null : p))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [journal.optIn, web]),
  );

  async function enable() {
    setBusy(true);
    setErased(false);
    try {
      const result = await enableLocation(email);
      setDenied(result === 'denied' || result === 'blocked' ? result : null);
    } finally {
      setBusy(false);
    }
  }

  function erase() {
    if (!confirmErase) {
      setConfirmErase(true);
      return;
    }
    setConfirmErase(false);
    setDenied(null);
    eraseLocation();
    setErased(true);
  }

  const status = journal.optIn ? l.on(journal.pings.length) : l.off;

  return (
    <Screen back title={l.title} subtitle={l.subtitle}>
      <Section title={l.keptTitle}>
        <Card style={{ gap: Spacing.md }}>
          {l.kept.map((line) => (
            <View key={line} style={styles.line}>
              <Icon name="check" size={18} color={theme.success} />
              <AppText style={{ flex: 1 }}>{line}</AppText>
            </View>
          ))}
        </Card>
      </Section>

      <Card style={{ gap: Spacing.md }}>
        <Fact title={l.whenTitle} text={l.when} />
        <Fact title={l.whereTitle} text={l.where} />
        <AppText variant="callout" color={theme.textSecondary}>
          {l.geocoder}
        </AppText>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <View style={styles.line}>
          <Icon name="map" size={20} color={journal.optIn && !denied ? theme.success : theme.textSecondary} />
          <AppText style={{ flex: 1, fontFamily: Fonts.bodySemi }}>{status}</AppText>
        </View>
        {web ? (
          <AppText color={theme.textSecondary}>{l.web}</AppText>
        ) : (
          <>
            {denied && <InlineMessage kind="error" text={l.denied} />}
            {denied === 'blocked' || (denied && journal.optIn) ? (
              <Button variant="secondary" label={l.settings} onPress={() => Linking.openSettings()} />
            ) : null}
            {!journal.optIn ? (
              <Button label={l.enable} loading={busy} onPress={enable} />
            ) : (
              <Button variant="secondary" label={l.pause} onPress={pauseLocation} />
            )}
            {journal.pings.length > 0 && (
              <Button variant="secondary" label={confirmErase ? l.eraseConfirm : l.erase} onPress={erase} />
            )}
            {erased && <InlineMessage kind="success" text={l.erased} />}
          </>
        )}
        <AppText variant="callout" color={theme.textSecondary}>
          {l.without}
        </AppText>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow
            icon="calendar"
            title={l.journalLink}
            onPress={() => router.push({ pathname: '/recap/timeline', params: { month: thisMonth() } })}
          />
        </ListGroup>
      </Card>
    </Screen>
  );
}

function Fact({ title, text }: { title: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" color={theme.textSecondary}>
        {title}
      </AppText>
      <AppText>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
