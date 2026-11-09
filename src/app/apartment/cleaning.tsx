import { CleaningSupplies, CleaningVisits } from '@/components/cleaning';
import { Screen } from '@/components/screen';
import { useI18n } from '@/i18n';
import { useHomeState } from '@/lib/home';

export default function CleaningScreen() {
  const { t } = useI18n();
  const { refresh } = useHomeState();
  return (
    <Screen back title={t.apartment.cleaning.title} subtitle={t.apartment.cleaning.subtitle} onRefresh={refresh}>
      <CleaningVisits />
      <CleaningSupplies />
    </Screen>
  );
}
