import { useI18n } from '../i18n/I18nProvider';
import { ButtonLink } from '../ui/Button';
import { PageHeader } from '../ui/Heading';

export function NotFoundPage() {
  const { m } = useI18n();
  return (
    <div className="pt-20">
      <PageHeader kicker="404" title={m.notFound.title} />
      <div className="mt-10">
        <ButtonLink to="/" variant="secondary" arrow>
          {m.notFound.home}
        </ButtonLink>
      </div>
    </div>
  );
}
