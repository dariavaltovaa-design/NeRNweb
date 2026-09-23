import { useState } from 'react';
import { guessPlatform, isStandalone, promptInstall, useCanPromptInstall } from '../../app/install';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';

/** "Put NeRN on the home screen": the real prompt where the browser offers one, steps otherwise. */
export function InstallGuide() {
  const { m } = useI18n();
  const canPrompt = useCanPromptInstall();
  const [platform, setPlatform] = useState<'ios' | 'android'>(guessPlatform);

  if (isStandalone()) return <p className="text-16 text-muted">{m.install.installed}</p>;

  return (
    <div className="flex flex-col gap-5">
      {canPrompt && (
        <Button onClick={() => void promptInstall()} variant="secondary">
          {m.install.button}
        </Button>
      )}
      <Segmented<'ios' | 'android'>
        legend=""
        name="platform"
        value={platform}
        onChange={setPlatform}
        options={[
          { value: 'ios', label: m.install.ios },
          { value: 'android', label: m.install.android },
        ]}
      />
      <ol className="flex flex-col gap-3">
        {(platform === 'ios' ? m.install.iosSteps : m.install.androidSteps).map((step, i) => (
          <li key={step} className="flex gap-4 text-16">
            <span className="w-5 shrink-0 font-display font-semibold text-accent">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
