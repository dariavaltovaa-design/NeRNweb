// Small input controls for the check-in and settings. All are native elements underneath,
// so keyboards and screen readers work without extra code. Touch targets ≥ 44 px.

import { useI18n } from '../i18n/I18nProvider';
import { Minus, Plus } from './icons';

/** A toggle chip (tags, yes/no). */
export function Chip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={
        'min-h-11 rounded-full px-4 text-14 ring-1 ring-inset transition-colors duration-160 ease-out ' +
        (pressed ? 'bg-text text-bg ring-text' : 'text-text ring-hairline hover:bg-surface')
      }
    >
      {children}
    </button>
  );
}

/** Number with − / + (sleep hours, test time). */
export function Stepper({
  label,
  value,
  display,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  const { m } = useI18n();
  const button =
    'grid size-11 place-items-center rounded-full ring-1 ring-hairline ring-inset text-text ' +
    'transition-colors duration-160 hover:bg-surface disabled:opacity-30';
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        className={button}
        aria-label={`${label}: ${m.common.decrease}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus />
      </button>
      <output aria-live="polite" aria-label={label} className="serif-caps text-40">
        {display}
      </output>
      <button
        type="button"
        className={button}
        aria-label={`${label}: ${m.common.increase}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus />
      </button>
    </div>
  );
}

/** A 1–5 scale with words at both ends (sleep quality, mood). */
export function Scale5({
  label,
  name,
  value,
  low,
  high,
  onChange,
}: {
  label: string;
  name: string;
  value: number | undefined;
  low: string;
  high: string;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const { m } = useI18n();
  return (
    <fieldset>
      <legend className="kicker mb-3 text-muted">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <label
            key={n}
            className={
              'flex min-h-11 cursor-pointer items-center justify-center rounded-inner text-16 ring-1 ring-inset ' +
              'transition-colors duration-160 ease-out has-checked:bg-text has-checked:text-bg has-checked:ring-text ' +
              'ring-hairline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent'
            }
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
              aria-label={m.checkin.scaleAria.replace('{label}', label).replace('{n}', String(n))}
            />
            <span aria-hidden="true">{n}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-12 text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

/** An on/off switch with a visible label. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span className="text-16">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={
          'relative h-7 w-12 shrink-0 rounded-full ring-1 ring-inset transition-colors duration-160 ease-out ' +
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ' +
          (checked ? 'bg-text ring-text' : 'ring-hairline')
        }
      >
        <span
          className={
            'absolute top-1 size-5 rounded-full transition-[left,background-color] duration-160 ease-out ' +
            (checked ? 'left-6 bg-bg' : 'left-1 bg-muted')
          }
        />
      </span>
    </label>
  );
}
