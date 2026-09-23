import { useI18n } from '../../i18n/I18nProvider';
import { PageTitle } from '../../ui/PageTitle';

export function OnboardingPage() {
  const { m } = useI18n();
  return (
    <div className="pt-16">
      <PageTitle>{m.onboarding.title}</PageTitle>
      <p className="mt-2 text-16 text-muted">{m.onboarding.placeholder}</p>
    </div>
  );
}
