import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import { Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  cleaningSupplies,
  daysUntil,
  formatLongDate,
  pastCleanings,
  upcomingCleanings,
  type CleaningVisit,
} from '@/lib/cleaning';
import { formatTime } from '@/lib/format';

/** Next visit + upcoming / done visits, in one card. */
export function CleaningVisits() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const c = t.apartment.cleaning;
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming');

  const next = upcomingCleanings[0];
  const visits = tab === 'upcoming' ? upcomingCleanings.slice(1) : pastCleanings;

  function when(v: CleaningVisit) {
    const n = daysUntil(v.date);
    return n === 0 ? c.today : n === 1 ? c.tomorrow : c.inDays(n);
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      {next && (
        <View style={{ gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {c.next} · {when(next)}
          </AppText>
          <AppText variant="title">{capitalize(formatLongDate(next.date, lang))}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {formatTime(next.time, lang)}
          </AppText>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: theme.line }]} />

      <View style={styles.tabs}>
        <Chip
          label={`${c.upcoming} · ${upcomingCleanings.length - 1}`}
          selected={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        />
        <Chip
          label={`${c.done} · ${pastCleanings.length}`}
          selected={tab === 'done'}
          onPress={() => setTab('done')}
        />
      </View>

      {visits.length ? (
        <ListGroup inset>
          {visits.map((v) => (
            <ListRow
              key={v.date}
              icon={v.status === 'done' ? 'checkCircle' : 'clock'}
              title={capitalize(formatLongDate(v.date, lang))}
              value={formatTime(v.time, lang)}
              accessory={
                <AppText
                  variant="caption"
                  color={v.status === 'done' ? theme.success : theme.textSecondary}
                  style={{ fontFamily: Fonts.bodyMedium }}>
                  {v.status === 'done' ? c.statusDone : c.statusScheduled}
                </AppText>
              }
            />
          ))}
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
            {c.suppliesTitle}
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
  divider: { height: StyleSheet.hairlineWidth },
  tabs: { flexDirection: 'row', gap: Spacing.sm },
  tableHead: { flexDirection: 'row', paddingTop: 4 },
  supply: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12 },
  pt: { textAlign: 'right', maxWidth: '45%' },
  actions: { gap: 4, marginTop: Spacing.xs },
});
