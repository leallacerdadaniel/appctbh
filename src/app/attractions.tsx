import { ExplorerContent } from '@/components/explorer-content';
import { Screen } from '@/components/screen';
import { useI18n } from '@/i18n';

/**
 * Every place to see in BH, by kind (museums, parks and viewpoints, markets…): the full list behind "À voir à BH" in
 * Explorer › Sortir (2026-11-27, when Culture stopped being its own category).
 */
export default function AttractionsScreen() {
  const { t } = useI18n();
  return (
    <Screen back title={t.explorerTab.sights} subtitle={t.explorerTab.sightsHint}>
      <ExplorerContent segments={['bh']} />
    </Screen>
  );
}
