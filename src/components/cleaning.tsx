import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  canRate,
  cleaningSupplies,
  daysUntil,
  formatLongDate,
  pastCleanings,
  upcomingCleanings,
  type CleaningVisit,
} from '@/lib/cleaning';
import { formatTime } from '@/lib/format';
import { useHome } from '@/lib/home';

/** Upcoming / done visits in date order, with the next visit marked first. */
export function CleaningVisits() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.apartment.cleaning;
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming');
  const { cleanings } = useHome();

  const upcoming = upcomingCleanings(cleanings);
  const past = pastCleanings(cleanings);
  const visits = tab === 'upcoming' ? upcoming : past;

  function when(v: CleaningVisit) {
    const n = daysUntil(v.date);
    return n === 0 ? c.today : n === 1 ? c.tomorrow : c.inDays(n);
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.tabs}>
        <Chip
          label={`${c.upcoming} · ${upcoming.length}`}
          selected={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        />
        <Chip
          label={`${c.done} · ${past.length}`}
          selected={tab === 'done'}
          onPress={() => setTab('done')}
        />
      </View>

      {visits.length ? (
        <ListGroup inset>
          {visits.map((v, i) => {
            const open = canRate(v);
            const isNext = tab === 'upcoming' && i === 0;
            return (
              <ListRow
                key={v.date}
                icon={v.status === 'done' ? 'checkCircle' : 'clock'}
                title={capitalize(formatLongDate(v.date, lang))}
                subtitle={isNext ? `${c.next} · ${when(v)}` : undefined}
                subtitleColor={isNext ? theme.brand : undefined}
                value={v.time ? formatTime(v.time, lang) : undefined}
                onPress={open ? () => router.push({ pathname: '/apartment/feedback', params: { id: v.id } }) : undefined}
                accessibilityLabel={open ? `${c.rate} · ${formatLongDate(v.date, lang)}` : undefined}
                accessory={
                  v.feedback ? (
                    // Own rating, editable while the window is open.
                    <View style={styles.rated} accessibilityLabel={c.stars(v.feedback.rating)}>
                      <Icon name="star" size={13} color={theme.brand} />
                      <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
                        {v.feedback.rating}
                      </AppText>
                      {open && <Icon name="chevronRight" size={15} color={theme.textTertiary} />}
                    </View>
                  ) : open ? (
                    <AppText variant="caption" color={theme.brand} style={{ fontFamily: Fonts.bodyMedium }}>
                      {c.rate}
                    </AppText>
                  ) : v.status === 'done' ? (
                    <AppText variant="caption" color={theme.success} style={{ fontFamily: Fonts.bodyMedium }}>
                      {c.statusDone}
                    </AppText>
                  ) : undefined
                }
              />
            );
          })}
        </ListGroup>
      ) : (
        <AppText variant="callout" color={theme.textSecondary}>
          {c.empty}
        </AppText>
      )}
    </Card>
  );
}

/** Supplies the student must keep at home, with the Portuguese names to buy them. */
export function CleaningSupplies() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const c = t.apartment.cleaning;

  async function copyList() {
    await Clipboard.setStringAsync(cleaningSupplies.map((s) => `• ${s.pt}`).join('\n'));
    toast(c.listCopied);
  }

  return (
    <Section title={c.suppliesTitle} subtitle={c.suppliesIntro}>
      <Card style={{ gap: Spacing.sm }}>
        <View style={styles.tableHead}>
          <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
            {c.suppliesProduct}
          </AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            {c.inPortuguese}
          </AppText>
        </View>
        <ListGroup>
          {cleaningSupplies.map((s) => (
            <View key={s.pt} style={styles.supply}>
              <AppText variant="callout" style={{ flex: 1 }}>
                {s.name[lang]}
              </AppText>
              <AppText variant="callout" style={[styles.pt, { fontFamily: Fonts.bodyMedium }]}>
                {s.pt}
              </AppText>
            </View>
          ))}
        </ListGroup>
        <View style={styles.actions}>
          <Button variant="secondary" label={c.copyList} onPress={copyList} />
          <Button
            variant="plain"
            label={c.whereToBuy}
            onPress={() => router.push({ pathname: '/nearby', params: { category: 'supermarket' } })}
          />
        </View>
      </Card>
    </Section>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.sm },
  tableHead: { flexDirection: 'row', paddingTop: 4 },
  supply: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12 },
  pt: { textAlign: 'right', maxWidth: '45%' },
  actions: { gap: 4, marginTop: Spacing.xs },
  rated: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
