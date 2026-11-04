import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { AppText, Card } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { useHome } from '@/lib/home';

const VISIBLE_MS = 5000;

/** A few quiet dots on the red band: festive without weighing the card down. */
const CONFETTI: { left: DimensionValue; top: number; size: number; gold?: boolean }[] = [
  { left: '9%', top: 22, size: 6 },
  { left: '19%', top: 52, size: 4, gold: true },
  { left: '28%', top: 18, size: 4 },
  { left: '34%', top: 42, size: 6 },
  { left: '46%', top: 14, size: 5, gold: true },
  { left: '57%', top: 26, size: 4 },
  { left: '66%', top: 46, size: 5 },
  { left: '74%', top: 16, size: 6, gold: true },
  { left: '84%', top: 34, size: 4 },
  { left: '91%', top: 58, size: 6 },
];

/**
 * Birthday wish, once a year. The server decides and records it in the same call (the "birthday"
 * route), so it never comes back after signing out, reinstalling or opening on another phone.
 * It runs again when the app returns to the foreground, in case the day changed while it was open.
 */
export function BirthdayGreeting() {
  const { token } = useAuth();
  const { student } = useHome();
  const [open, setOpen] = useState(false);
  const checkedDay = useRef<string | null>(null);

  const check = useCallback(() => {
    const today = new Date().toDateString();
    if (!token || checkedDay.current === today) return;
    checkedDay.current = today;
    appApi<{ show: boolean }>('birthday', { token })
      .then((r) => {
        if (r.show) setOpen(true);
      })
      .catch(() => {
        // Nothing was shown: try again the next time the app comes back.
        checkedDay.current = null;
      });
  }, [token]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return <BirthdayCard name={student.firstName} open={open} onClose={() => setOpen(false)} />;
}

/** The card itself: closes on its own after a few seconds, or on a tap anywhere. */
export function BirthdayCard({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, VISIBLE_MS);
    return () => clearTimeout(timer);
    // Only the opening restarts the countdown; onClose changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.birthday.close}
        onPress={onClose}
        style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.column}>
          <Card style={styles.card}>
            <View style={[styles.band, { backgroundColor: theme.brand }]}>
              {CONFETTI.map((c, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      left: c.left,
                      top: c.top,
                      width: c.size,
                      height: c.size,
                      backgroundColor: c.gold ? theme.star : theme.surface,
                      opacity: c.gold ? 1 : 0.55,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={[styles.badge, Shadow.card, { backgroundColor: theme.surface }]}>
              <Icon name="cake" size={28} color={theme.brand} />
            </View>
            <View style={styles.body}>
              <AppText color={theme.textSecondary} style={styles.center}>
                {t.birthday.title}
              </AppText>
              <AppText variant="display" style={styles.center}>
                {t.birthday.name(name)}
              </AppText>
              <AppText variant="callout" color={theme.textSecondary} style={[styles.center, styles.message]}>
                {t.birthday.body}
              </AppText>
            </View>
          </Card>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const BAND_HEIGHT = 84;
const BADGE_SIZE = 64;

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  column: { width: '100%', maxWidth: 300 },
  card: { padding: 0, overflow: 'hidden' },
  band: { height: BAND_HEIGHT },
  dot: { position: 'absolute', borderRadius: Radius.pill },
  badge: {
    position: 'absolute',
    top: BAND_HEIGHT - BADGE_SIZE / 2,
    alignSelf: 'center',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingTop: BADGE_SIZE / 2 + Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: 2,
  },
  center: { textAlign: 'center' },
  message: { marginTop: Spacing.sm },
});
