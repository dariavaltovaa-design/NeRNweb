import { useI18n } from '../../i18n/I18nProvider';
import { PageTitle } from '../../ui/PageTitle';

export function TodayPage() {
  const { m } = useI18n();
  return (
    <>
      <PageTitle>{m.today.title}</PageTitle>
      <p className="mt-2 text-16 text-muted">{m.today.placeholder}</p>
    </>
  );
}
