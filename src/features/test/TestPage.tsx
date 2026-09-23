import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * The test screen. Always the same, whatever the theme or time of day (SPEC: colour and
 * brightness of the stimulus affect reaction time). Stage 1 puts the attention test here.
 */
export function TestPage() {
  const { m } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'NeRN';
  }, []);

  function goBack(): void {
    // Opened by a direct link: there is no previous screen inside NeRN.
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  }

  return (
    <main className="fixed inset-0 flex touch-none flex-col items-center justify-center bg-stimulus-bg px-5 select-none">
      <p className="text-center text-16 text-stimulus-muted">{m.test.placeholder}</p>
      <button
        type="button"
        onClick={goBack}
        className="mt-6 min-h-11 px-4 text-14 text-stimulus-muted underline underline-offset-4"
      >
        {m.test.back}
      </button>
    </main>
  );
}
