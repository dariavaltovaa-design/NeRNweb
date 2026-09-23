import { useI18n } from '../../i18n/I18nProvider';
import { PageTitle } from '../../ui/PageTitle';

export function HistoryPage() {
  const { m } = useI18n();
  return (
    <>
      <PageTitle>{m.history.title}</PageTitle>
      <p className="mt-2 text-16 text-muted">{m.history.placeholder}</p>
    </>
  );
}
