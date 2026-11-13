import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { formatDayDate } from '@/lib/format';
import {
  bhStamp,
  houseSocialErrorText,
  useHouseSocialActions,
  usePackages,
  type PackagesData,
  type Parcel,
} from '@/lib/house-social';

const editHref = (id?: string) => (id ? `/house/package-edit?id=${id}` : '/house/package-edit') as Href;

/** "Amazon · Prévu jeu. 13 nov." · "Amazon · Expected Thu, Nov 13". */
function expectedLine(p: Parcel, t: Strings, lang: Lang) {
  const c = t.houseSocial.packages;
  return [p.carrier, p.expectedDate ? c.expectedOn(formatDayDate(p.expectedDate, lang, true)) : c.noDate]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Colis (Maison › À l’immeuble): what the student is waiting for. The team marks a package arrived at the
 * portaria (website panel; a trigger posts the notice to the bell), the student marks it picked up.
 */
export default function PackagesScreen() {
  const { t } = useI18n();
  const c = t.houseSocial.packages;
  const { state, reload } = usePackages();
  return (
    <Screen back title={c.title} subtitle={c.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={c.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && <Content data={state.data} />}
    </Screen>
  );
}

function Content({ data }: { data: PackagesData }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const c = t.houseSocial.packages;
  const act = useHouseSocialActions();
  const [error, setError] = useState<string | null>(null);

  const arrived = data.packages.filter((p) => p.status === 'arrived');
  const expected = data.packages.filter((p) => p.status === 'expected');
  const picked = data.packages.filter((p) => p.status === 'picked_up');

  async function pick(p: Parcel) {
    setError(null);
    try {
      await act.parcelPicked(p.id);
      toast(c.picked);
    } catch (e) {
      setError(houseSocialErrorText(e, t, 'action'));
    }
  }

  const addButton = (
    <Button
      label={c.add}
      icon={<Icon name="plus" size={17} color={theme.onBrand} />}
      onPress={() => router.push(editHref())}
    />
  );

  return (
    <>
      {arrived.length > 0 && (
        <Section title={c.arrived} subtitle={c.arrivedHint}>
          <TintCard>
            {arrived.map((p, i) => (
              <TintRow
                key={p.id}
                first={i === 0}
                icon="parcel"
                tint={theme.successSoft}
                ink={theme.success}
                title={p.description}
                subtitle={[
                  [p.carrier, p.arrivedAt && c.arrivedAt(bhStamp(p.arrivedAt, lang))].filter(Boolean).join(' · '),
                  p.teamNote && c.teamNote(p.teamNote),
                ]
                  .filter(Boolean)
                  .join('\n')}
                subtitleColor={theme.success}
                accessory={<RowPill primary label={c.pick} onPress={() => pick(p)} />}
              />
            ))}
          </TintCard>
          {error && <InlineMessage kind="error" text={error} />}
        </Section>
      )}

      <Section title={c.expected} subtitle={expected.length > 0 ? c.expectedHint : undefined}>
        {expected.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{c.empty}</AppText>
          </Card>
        ) : (
          <TintCard>
            {expected.map((p, i) => (
              <TintRow
                key={p.id}
                first={i === 0}
                icon="parcel"
                tint={theme.infoSoft}
                ink={theme.info}
                title={p.description}
                subtitle={expectedLine(p, t, lang)}
                onPress={() => router.push(editHref(p.id))}
              />
            ))}
          </TintCard>
        )}
        {addButton}
      </Section>

      <Card style={styles.how}>
        <Icon name="bell" size={18} color={theme.textSecondary} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {c.how}
        </AppText>
      </Card>

      {picked.length > 0 && (
        <Section title={c.pickedUp} subtitle={c.pickedUpHint}>
          <TintCard>
            {picked.map((p, i) => (
              <TintRow
                key={p.id}
                first={i === 0}
                done
                tint={theme.fill}
                ink={theme.textSecondary}
                title={p.description}
                subtitle={[p.carrier, p.pickedUpAt && c.pickedAt(bhStamp(p.pickedUpAt, lang))].filter(Boolean).join(' · ')}
              />
            ))}
          </TintCard>
        </Section>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  how: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
});
