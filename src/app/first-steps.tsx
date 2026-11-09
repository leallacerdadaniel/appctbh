import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { adminProcedures } from '@/lib/admin';
import { appUrl, services, type ServiceGroup } from '@/lib/services';
import { trackAction } from '@/lib/usage';

type Tab = 'apps' | 'paperwork';
/** The groups residents need in their first weeks (flights, buses and car rental stay in "Applis et services"). */
const GROUPS: ServiceGroup[] = ['daily', 'ride', 'food', 'money', 'bank', 'health', 'events'];

/**
 * "Premiers pas au Brésil" (v3, 2026-11-08): the apps residents install in their first week, each with
 * why and the one tip that matters, then CPF and the migration registration in order. Opened from the
 * arrival checklist and from Explorer.
 */
export default function FirstStepsScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const f = t.firstSteps;
  const [tab, setTab] = useState<Tab>('apps');

  return (
    <Screen back title={f.title} subtitle={f.subtitle}>
      <SegmentedControl
        options={[
          { value: 'apps', label: f.tabs.apps },
          { value: 'paperwork', label: f.tabs.paperwork },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'apps' ? (
        <>
          {GROUPS.map((g) => (
            <Section key={g} title={f.groups[g as keyof typeof f.groups] ?? t.services.groups[g]}>
              <TintCard>
                {services
                  .filter((s) => s.group === g)
                  .map((s, i) => (
                    <TintRow
                      key={s.id}
                      first={i === 0}
                      image={s.logo}
                      tint={theme.fill}
                      ink={theme.text}
                      title={s.name}
                      subtitle={f.why[s.id] ?? s.kind[lang]}
                      onPress={() => router.push({ pathname: '/services/[id]', params: { id: s.id } })}
                      accessory={
                        <RowPill
                          label={f.get}
                          onPress={() => {
                            trackAction('get_app', s.id);
                            Linking.openURL(appUrl(s));
                          }}
                        />
                      }
                    />
                  ))}
              </TintCard>
            </Section>
          ))}
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push('/services')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: Fonts.bodySemi }}>{f.more}</AppText>
              <AppText variant="caption" color={theme.textSecondary}>
                {f.moreHint}
              </AppText>
            </View>
            <Icon name="chevronRight" size={15} color={theme.textTertiary} />
          </PressableScale>
        </>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
            <Icon name="tip" size={20} color={theme.warning} />
            <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
              {t.admin.intro}
            </AppText>
          </Card>
          <TintCard>
            {adminProcedures.map((p, i) => (
              <TintRow
                key={p.id}
                first={i === 0}
                emoji={String(i + 1)}
                tint={theme.brandSoft}
                ink={theme.brand}
                title={p.title}
                subtitle={p.kind[lang]}
                onPress={() => router.push({ pathname: '/admin/[id]', params: { id: p.id } })}
              />
            ))}
          </TintCard>
        </>
      )}

      <PressableScale
        accessibilityRole="button"
        onPress={() => router.push('/assistant' as Href)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderRadius: Radius.lg,
          backgroundColor: theme.brandSoft,
        }}>
        <Icon name="sparkles" size={18} color={theme.brand} />
        <AppText style={{ flex: 1, fontFamily: Fonts.bodySemi }}>{f.ask}</AppText>
        <Icon name="chevronRight" size={15} color={theme.brand} />
      </PressableScale>
    </Screen>
  );
}
