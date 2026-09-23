import { useId, useRef } from 'react';
import type { Session } from '../../db/schema';
import { daysBetween } from '../../stats/dates';

export interface ChartPoint {
  date: string;
  value: number;
  session: Session;
}

const W = 340;
const PAD = { left: 30, right: 10, top: 14, bottom: 24 };

/**
 * Form over 60 days (SPEC «Екран 5»): dots per session, a hatched band for the usual range,
 * A/B markers (A — hollow, B — filled with the accent). Pure SVG, no chart library.
 */
export function FormChart({
  points,
  range,
  startDate,
  endDate,
  height = 190,
  selected,
  onSelect,
  labels,
  interactive = false,
  ariaLabel,
}: {
  points: readonly ChartPoint[];
  range: { low: number; high: number } | null;
  startDate: string;
  endDate: string;
  height?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
  labels: { start: string; end: string };
  interactive?: boolean;
  ariaLabel: string;
}) {
  const hatchId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const H = height;
  const span = Math.max(1, daysBetween(startDate, endDate));
  const minValue = Math.min(...points.map((p) => p.value), range?.low ?? 100);
  const floor = Math.max(0, Math.min(60, Math.floor((minValue - 5) / 10) * 10));

  const x = (date: string) =>
    PAD.left + (daysBetween(startDate, date) / span) * (W - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top + (1 - (value - floor) / (100 - floor)) * (H - PAD.top - PAD.bottom);

  function pick(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !onSelect || points.length === 0) return;
    const box = svg.getBoundingClientRect();
    const svgX = ((clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - svgX) < Math.abs(x(points[best]!.date) - svgX)) best = i;
    });
    onSelect(best);
  }

  const line = points.map((p) => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const current = selected !== null && selected !== undefined ? points[selected] : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      className={`w-full select-none ${interactive ? 'touch-none' : ''}`}
      onPointerDown={interactive ? (e) => pick(e.clientX) : undefined}
      onPointerMove={
        interactive
          ? (e) => (e.buttons > 0 || e.pointerType === 'mouse' ? pick(e.clientX) : undefined)
          : undefined
      }
      onKeyDown={
        interactive && onSelect
          ? (e) => {
              const i = selected ?? points.length - 1;
              if (e.key === 'ArrowLeft') onSelect(Math.max(0, i - 1));
              if (e.key === 'ArrowRight') onSelect(Math.min(points.length - 1, i + 1));
            }
          : undefined
      }
    >
      <defs>
        <pattern
          id={hatchId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--band)" strokeWidth="1" opacity="0.45" />
        </pattern>
      </defs>

      {/* Grid: floor, middle, 100 */}
      {[floor, (floor + 100) / 2, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--hairline)"
            strokeDasharray="2 4"
          />
          <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}

      {range && (
        <rect
          x={PAD.left}
          width={W - PAD.left - PAD.right}
          y={y(range.high)}
          height={Math.max(1, y(range.low) - y(range.high))}
          fill={`url(#${hatchId})`}
        />
      )}

      {points.length > 1 && (
        <polyline points={line} fill="none" stroke="var(--muted)" strokeWidth="1" opacity="0.6" />
      )}

      {current && (
        <line
          x1={x(current.date)}
          x2={x(current.date)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="var(--text)"
          strokeWidth="1"
        />
      )}

      {points.map((p, i) => {
        const cx = x(p.date);
        const cy = y(p.value);
        const isSelected = i === selected;
        const r = isSelected ? 5.5 : 3.5;
        if (p.session.condition === 'A')
          return (
            <circle
              key={p.session.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="var(--bg)"
              stroke="var(--text)"
              strokeWidth="1.5"
            />
          );
        if (p.session.condition === 'B')
          return <circle key={p.session.id} cx={cx} cy={cy} r={r} fill="var(--accent)" />;
        return (
          <circle key={p.session.id} cx={cx} cy={cy} r={isSelected ? 5 : 3} fill="var(--text)" />
        );
      })}

      <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--muted)">
        {labels.start}
      </text>
      <text x={W - PAD.right} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">
        {labels.end}
      </text>
    </svg>
  );
}
