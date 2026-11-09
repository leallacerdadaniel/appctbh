import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import {
  houseSocialErrorText,
  portariaMessage,
  splitVisits,
  useHouseSocialActions,
  useVisitors,
  visitWhen,
  type Visitor,
  type VisitorsData,
} from '@/lib/house-social';
import { contacts } from '@/lib/mock-data';
import { trackAction } from '@/lib/usage';

const editHref = (id?: string) => (id ? `/house/visitor-edit?id=${id}` : '/house/visitor-edit') as Href;

/**
 * Visites (Maison › À l’immeuble): who is coming, and "Prévenir la portaria", which opens WhatsApp with the
 * message in Portuguese for the porteiro (the building's portaria, or the Chez Toi team until the team
 * fills in its number).
 */
export default function VisitorsScreen() {
  const { t } = useI18n();
  const v = t.houseSocial.visitors;
  const { state, reload } = useVisitors();
  return (
    <Screen back title={v.title} subtitle={v.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={v.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && <Content data={state.data} />}
    </Screen>
  );
}

function Content({ data }: { data: VisitorsData }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const v = t.houseSocial.visitors;
  const { upcoming, past } = splitVisits(data.visitors);
  const toTeam = !data.portaria.whatsapp;

  return (
    <>
      <Section title={v.upcoming} subtitle={upcoming.length > 0 ? v.upcomingHint : undefined}>
        {upcoming.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{v.empty}</AppText>
          </Card>
        ) : (
          upcoming.map((visit) => <VisitCard key={visit.id} visit={visit} portaria={data.portaria.whatsapp} />)
        )}
        <Button
          label={v.add}
          icon={<Icon name="plus" size={17} color={theme.onBrand} />}
          onPress={() => router.push(editHref())}
        />
      </Section>

      <Card style={{ gap: Spacing.sm }}>
        <View style={styles.whyTop}>
          <View style={[styles.whyIcon, { backgroundColor: theme.infoSoft }]}>
            <Icon name="door" size={19} color={theme.info} />
          </View>
          <AppText style={{ flex: 1, fontFamily: Fonts.bodySemi }}>{v.whyTitle}</AppText>
        </View>
        <AppText variant="callout" color={theme.textSecondary}>
          {v.why}
        </AppText>
        {toTeam && <Notice icon="info" text={v.noPortaria} />}
      </Card>

      {past.length > 0 && (
        <Section title={v.past} subtitle={v.pastHint}>
          <TintCard>
            {past.map((visit, i) => (
              <TintRow
                key={visit.id}
                first={i === 0}
                icon="visitor"
                tint={theme.fill}
                ink={theme.textSecondary}
                title={visit.name}
                subtitle={visitWhen(visit, t, lang)}
              />
            ))}
          </TintCard>
        </Section>
      )}
    </>
  );
}

/** One upcoming visit: who and when, whether the portaria was told, and the two actions. */
function VisitCard({ visit, portaria }: { visit: Visitor; portaria: string | null }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const v = t.houseSocial.visitors;
  const { student, apartment } = useHome();
  const act = useHouseSocialActions();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notified = !!visit.notifiedAt;

  function notify() {
    const text = portariaMessage({
      visitor: visit,
      firstName: student.firstName,
      fullName: student.fullName,
      unit: apartment.complement,
      apartmentName: apartment.nickname,
      toTeam: !portaria,
    });
    trackAction('open_whatsapp', portaria ? 'portaria' : 'visitors');
    Linking.openURL(`https://wa.me/${portaria ?? contacts.whatsapp}?text=${encodeURIComponent(text)}`)
      .then(() => act.markVisitorNotified(visit.id))
      .catch(() => {});
  }

  async function cancel() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    setError(null);
    try {
      await act.cancelVisitor(visit.id);
      toast(v.cancelled);
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'action'));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <TintCard>
      <TintRow
        first
        icon="visitor"
        tint={theme.infoSoft}
        ink={theme.info}
        title={visit.name}
        subtitle={[visitWhen(visit, t, lang), visit.note].filter(Boolean).join('\n')}
        onPress={() => router.push(editHref(visit.id))}
      />
      <View style={[styles.footer, { borderTopColor: theme.line }]}>
        <View style={styles.status}>
          <Icon name={notified ? 'checkCircle' : 'clock'} size={15} color={notified ? theme.success : theme.warning} />
          <AppText variant="caption" color={notified ? theme.success : theme.warning} style={{ flex: 1 }}>
            {notified ? v.notified : v.notNotified}
          </AppText>
        </View>
        <View style={styles.actions}>
          <RowPill
            primary={!notified}
            label={notified ? v.notifyAgain : portaria ? v.notify : v.notifyTeam}
            onPress={notify}
          />
          <RowPill label={confirming ? v.confirmCancel : v.cancel} onPress={busy ? () => {} : cancel} />
        </View>
        {error && <InlineMessage kind="error" text={error} />}
      </View>
    </TintCard>
  );
}

const styles = StyleSheet.create({
  whyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footer: {
    gap: Spacing.sm,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
