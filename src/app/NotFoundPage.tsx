import { useI18n } from '../i18n/I18nProvider';
import { ButtonLink } from '../ui/Button';
import { PageTitle } from '../ui/PageTitle';

export function NotFoundPage() {
  const { m } = useI18n();
  return (
    <div className="pt-16">
      <PageTitle>{m.notFound.title}</PageTitle>
      <div className="mt-8">
        <ButtonLink to="/" variant="secondary">
          {m.notFound.home}
        </ButtonLink>
      </div>
    </div>
  );
}
