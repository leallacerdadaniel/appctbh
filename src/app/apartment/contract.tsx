import { DocumentCard } from '@/components/document-card';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatBrl, formatDate } from '@/lib/format';
import { demoContract, demoContractDocument } from '@/lib/mock-data';

export default function ContractScreen() {
  const { t, lang } = useI18n();
  return (
    <Screen back title={t.apartment.contract} subtitle={t.apartment.contractHint}>
      <Card style={{ paddingVertical: 0 }}>
        <ListGroup>
          <ListRow title={t.apartment.semester} value={demoContract.semester} />
          <ListRow title={t.apartment.moveIn} value={formatDate(demoContract.moveIn, lang)} />
          <ListRow title={t.apartment.moveOut} value={formatDate(demoContract.moveOut, lang)} />
          <ListRow title={t.apartment.monthlyRent} value={formatBrl(demoContract.monthlyRentBrl, lang)} />
        </ListGroup>
      </Card>
      <DocumentCard doc={demoContractDocument} />
    </Screen>
  );
}
