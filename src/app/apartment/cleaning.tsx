import { CleaningSupplies, CleaningVisits } from '@/components/cleaning';
import { Screen } from '@/components/screen';
import { useI18n } from '@/i18n';

export default function CleaningScreen() {
  const { t } = useI18n();
  return (
    <Screen back title={t.apartment.cleaning.title} subtitle={t.apartment.cleaning.subtitle}>
      <CleaningVisits />
      <CleaningSupplies />
    </Screen>
  );
}
