import type { Verdict } from '../../stats/experiment';

type Measured = Exclude<Verdict, { kind: 'not_enough' }>;

/** A horizontal scale around zero: the dot is Δ, the bar is the 95% interval (SPEC «Екран 6»). */
export function VerdictScale({ verdict, label }: { verdict: Measured; label: string }) {
  const W = 320;
  const H = 64;
  const mid = W / 2;
  const extreme = Math.max(
    10,
    Math.abs(verdict.interval[0]),
    Math.abs(verdict.interval[1]),
    Math.abs(verdict.delta),
  );
  const limit = Math.ceil(extreme / 5) * 5;
  const x = (v: number) => mid + (v / limit) * (W / 2 - 16);
  const colour =
    verdict.kind === 'noise'
      ? 'var(--muted)'
      : verdict.kind === 'better'
        ? 'var(--band)'
        : 'var(--below)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
      <line x1="16" x2={W - 16} y1="30" y2="30" stroke="var(--hairline)" />
      <line x1={mid} x2={mid} y1="16" y2="44" stroke="var(--muted)" />
      <line
        x1={x(verdict.interval[0])}
        x2={x(verdict.interval[1])}
        y1="30"
        y2="30"
        stroke={colour}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx={x(verdict.delta)}
        cy="30"
        r="6"
        fill="var(--accent)"
        stroke="var(--bg)"
        strokeWidth="2"
      />
      <text x="16" y="60" fontSize="10" fill="var(--muted)">
        −{limit}%
      </text>
      <text x={mid} y="60" fontSize="10" fill="var(--muted)" textAnchor="middle">
        0
      </text>
      <text x={W - 16} y="60" fontSize="10" fill="var(--muted)" textAnchor="end">
        +{limit}%
      </text>
    </svg>
  );
}
