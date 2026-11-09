import { router } from 'expo-router';
import { Linking, Platform, StyleSheet } from 'react-native';

import { aroundMeUrl } from '@/components/around-me';
import { EmergencyNumbers } from '@/components/health-ui';
import { TintCard } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { NoteCard } from '@/components/phone-stolen-ui';
import { PhraseRow, useSpeaker } from '@/components/portuguese-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  ARAUJO_SEARCH,
  ARAUJO_SERVICE_ID,
  DOCTORALIA_URL,
  PSYCHOLOGIST_URL,
  HEALTH_PLACES,
  RECEPTION_PHRASES,
} from '@/lib/health';
import { usePortugueseProgress } from '@/lib/portuguese-progress';
import { getService } from '@/lib/services';
import { trackAction } from '@/lib/usage';

/**
 * "Santé / Health" (2026-11-09): emergency numbers, where to go (UPA, two private hospitals) and how paying
 * works there, what to say at the front desk (with audio), pharmacies, doctors in French or English, and
 * someone to talk to. Content and sources in `src/lib/health.ts`. Opened from the SOS page and Explorer › Pratique.
 */
export default function HealthScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const h = t.health;
  const speaker = useSpeaker();
  const { isLearned } = usePortugueseProgress();
  const araujo = getService(ARAUJO_SERVICE_ID);

  return (
    <Screen back title={h.title} subtitle={h.subtitle}>
      <Section title={h.urgent} subtitle={h.urgentHint}>
        <EmergencyNumbers />
      </Section>

      <Section title={h.where} subtitle={h.whereHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {HEALTH_PLACES.map((p) => (
              <ListRow
                key={p.id}
                icon={p.icon}
                title={p.name}
                subtitle={`${p.kind[lang]}\n${p.address}`}
                accessibilityLabel={h.openMaps(p.name)}
                onPress={() => Linking.openURL(aroundMeUrl(p.mapsQuery))}
                accessory={<Icon name="directions" size={18} color={theme.brand} />}
              />
            ))}
          </ListGroup>
        </Card>
        <NoteCard icon="receipt" text={h.payment} />
      </Section>

      <Section title={h.reception} subtitle={h.receptionHint}>
        <TintCard>
          {RECEPTION_PHRASES.map((phrase, i) => (
            <PhraseRow
              key={phrase.id}
              first={i === 0}
              phrase={phrase}
              playing={speaker.playing === phrase.id}
              learned={isLearned(phrase.id)}
              onPress={() => speaker.toggle(phrase)}
            />
          ))}
        </TintCard>
        {/* expo-speech is silent on an iPhone in silent mode. */}
        {Platform.OS === 'ios' && (
          <AppText variant="caption" color={theme.textSecondary}>
            {t.portuguese.silentMode}
          </AppText>
        )}
      </Section>

      <Section title={h.pharmacies} subtitle={h.pharmaciesHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="pharmacy"
              title={h.findAraujo}
              subtitle={h.findAraujoHint}
              accessibilityLabel={h.findAraujo}
              onPress={() => {
                trackAction('around_me', 'araujo');
                Linking.openURL(aroundMeUrl(ARAUJO_SEARCH));
              }}
              accessory={<Icon name="directions" size={18} color={theme.brand} />}
            />
            {araujo && (
              <ListRow
                icon="apps"
                title={h.araujoApp}
                subtitle={h.araujoAppHint}
                onPress={() => router.push({ pathname: '/services/[id]', params: { id: araujo.id } })}
              />
            )}
          </ListGroup>
        </Card>
        {araujo && (
          <AppText variant="caption" color={theme.textSecondary}>
            {araujo.tip[lang]}
          </AppText>
        )}
      </Section>

      <Section title={h.doctors} subtitle={h.doctorsHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="website"
              title={h.doctoralia}
              subtitle={h.doctoraliaHint}
              accessibilityLabel={h.doctoralia}
              onPress={() => Linking.openURL(DOCTORALIA_URL)}
              accessory={<Icon name="external" size={16} color={theme.textTertiary} />}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={h.talk} subtitle={h.talkHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="people"
              title={h.psychologist}
              subtitle={h.psychologistHint}
              accessibilityLabel={h.psychologist}
              onPress={() => Linking.openURL(PSYCHOLOGIST_URL)}
              accessory={<Icon name="external" size={16} color={theme.textTertiary} />}
            />
          </ListGroup>
        </Card>
      </Section>

      <AppText variant="caption" color={theme.textSecondary}>
        {h.sources}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
});
