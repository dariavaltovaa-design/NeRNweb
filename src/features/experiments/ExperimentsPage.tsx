import { useI18n } from '../../i18n/I18nProvider';
import { PageTitle } from '../../ui/PageTitle';

export function ExperimentsPage() {
  const { m } = useI18n();
  return (
    <>
      <PageTitle>{m.experiments.title}</PageTitle>
      <p className="mt-2 text-16 text-muted">{m.experiments.placeholder}</p>
    </>
  );
}
