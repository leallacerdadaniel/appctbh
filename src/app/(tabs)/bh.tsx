import { router, useLocalSearchParams } from 'expo-router';

import { ExplorerContent } from '@/components/explorer-content';
import { GuideContent } from '@/components/guide-content';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useI18n } from '@/i18n';
import { trackAction } from '@/lib/usage';

type BhSection = 'guide' | 'explorer';
const SECTIONS: BhSection[] = ['guide', 'explorer'];

/**
 * "BH" tab: living in Belo Horizonte. Stage 1 (owner, 2026-11-08): the old Guide and Explorer tabs
 * side by side under a segmented control; their full fusion is stage 2.
 *
 * The segment lives in the route params, so a link can open either one: `/bh?section=explorer`.
 * `q` / `focus` are passed on to the Guide search.
 */
export default function BhScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ section?: string; q?: string; focus?: string }>();
  const section: BhSection = params.section === 'explorer' ? 'explorer' : 'guide';

  return (
    <Screen title={t.bh.title} subtitle={section === 'guide' ? t.guide.subtitle : t.explore.subtitle}>
      <SegmentedControl
        options={SECTIONS.map((x) => ({ value: x, label: t.bh.segments[x] }))}
        value={section}
        onChange={(next) => {
          trackAction('bh_section', next);
          router.setParams({ section: next });
        }}
      />
      {section === 'guide' ? <GuideContent q={params.q} focus={params.focus} /> : <ExplorerContent />}
    </Screen>
  );
}
