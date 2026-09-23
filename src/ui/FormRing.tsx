import { useEffect, useState } from 'react';

export type RingState =
  | { kind: 'empty' }
  | { kind: 'calibration'; done: number; total: number }
  | {
      kind: 'form';
      value: number;
      range: { low: number; high: number } | null;
      newPeak: boolean;
    };

const SIZE = 280;
const C = SIZE / 2;
const R_VALUE = 114;
const R_RANGE = 124;
const TICKS = 60;

function circumference(r: number) {
  return 2 * Math.PI * r;
}

/**
 * The daily Form as an instrument dial: fine ticks, a thin track, the usual range as an outer arc,
 * the value as one warm arc. Fills once (900 ms, soft spring) when `animate` is set.
 */
export function FormRing({
  state,
  label,
  kicker,
  caption,
  animate = false,
}: {
  state: RingState;
  /** Full sentence for screen readers: "Form 87 of 100, within your usual range". */
  label: string;
  kicker: string;
  /** Small line under the number ("of 100"). */
  caption?: string;
  animate?: boolean;
}) {
  const [filled, setFilled] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFilled(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const valueCirc = circumference(R_VALUE);
  const rangeCirc = circumference(R_RANGE);
  const fraction = state.kind === 'form' ? state.value / 100 : 0;

  return (
    <figure
      role="img"
      aria-label={label}
      className="relative mx-auto aspect-square w-full max-w-[300px]"
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        {/* Dial ticks: every fifth one longer, like an instrument. */}
        <g className="text-muted" stroke="currentColor">
          {Array.from({ length: TICKS }, (_, i) => {
            const angle = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
            const long = i % 5 === 0;
            const r1 = long ? 128 : 131;
            const r2 = 136;
            return (
              <line
                key={i}
                x1={C + r1 * Math.cos(angle)}
                y1={C + r1 * Math.sin(angle)}
                x2={C + r2 * Math.cos(angle)}
                y2={C + r2 * Math.sin(angle)}
                strokeWidth={long ? 1.2 : 0.8}
                opacity={long ? 0.7 : 0.4}
              />
            );
          })}
        </g>

        <g transform={`rotate(-90 ${C} ${C})`} fill="none">
          <circle cx={C} cy={C} r={R_VALUE} stroke="var(--hairline)" strokeWidth="1" />

          {state.kind === 'form' && state.range && (
            <circle
              cx={C}
              cy={C}
              r={R_RANGE}
              stroke="var(--band)"
              strokeWidth="3"
              strokeDasharray={`${(rangeCirc * (state.range.high - state.range.low)) / 100} ${rangeCirc}`}
              strokeDashoffset={(-rangeCirc * state.range.low) / 100}
              opacity={filled ? 0.9 : 0}
              className="transition-opacity delay-500 duration-500"
            />
          )}

          {state.kind === 'form' && (
            <circle
              cx={C}
              cy={C}
              r={R_VALUE}
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${valueCirc} ${valueCirc}`}
              strokeDashoffset={filled ? valueCirc * (1 - fraction) : valueCirc}
              style={{ transition: 'stroke-dashoffset 900ms var(--ease-spring)' }}
            />
          )}

          {state.kind === 'calibration' &&
            Array.from({ length: state.total }, (_, i) => {
              const segment = valueCirc / state.total;
              const gap = 10;
              return (
                <circle
                  key={i}
                  cx={C}
                  cy={C}
                  r={R_VALUE}
                  stroke={i < state.done ? 'var(--accent)' : 'var(--hairline)'}
                  strokeWidth={i < state.done ? 4 : 2}
                  strokeLinecap="round"
                  strokeDasharray={`${segment - gap} ${valueCirc}`}
                  strokeDashoffset={-(segment * i + gap / 2)}
                />
              );
            })}
        </g>
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`kicker ${state.kind === 'form' && state.newPeak ? 'text-accent' : 'text-muted'}`}
        >
          {kicker}
        </span>
        <span className="serif-caps mt-1 text-96 tracking-[-0.03em]">
          {state.kind === 'form'
            ? state.value
            : state.kind === 'calibration'
              ? `${state.done}/${state.total}`
              : '—'}
        </span>
        {caption && <span className="kicker mt-1 text-muted">{caption}</span>}
      </figcaption>
    </figure>
  );
}
