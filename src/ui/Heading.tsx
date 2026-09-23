import { useEffect, type ReactNode } from 'react';

export interface EditorialTitle {
  text: string;
  accent: string;
}

/** Small uppercase label above a title or a value. No digits here: З and 3 look alike. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`kicker text-muted ${className}`}>{children}</p>;
}

/**
 * Light serif capitals; the accent part sits on its own line in the accent colour.
 * Never italic: Cyrillic italics read like Latin letters in an interface.
 */
export function Editorial({
  title,
  className = '',
  animate = false,
}: {
  title: EditorialTitle;
  className?: string;
  /** Lines slide up from behind a mask, one after another (landing headline). */
  animate?: boolean;
}) {
  const line = (text: string, index: number, accent: boolean) => (
    <span className="block overflow-hidden pb-[0.06em]">
      <span
        className={`block ${accent ? 'text-accent' : ''} ${animate ? 'animate-line' : ''}`}
        style={
          animate ? ({ '--line-delay': `${index * 120}ms` } as React.CSSProperties) : undefined
        }
      >
        {text}
      </span>
    </span>
  );
  return (
    <span className={`serif-caps block ${className}`}>
      {line(title.text, 0, false)}
      {line(title.accent, 1, true)}
    </span>
  );
}

/** Screen header: kicker + title. Also sets the browser tab title for screen readers. */
export function PageHeader({ kicker, title }: { kicker?: ReactNode; title: string }) {
  useEffect(() => {
    document.title = `${title} · NeRN`;
  }, [title]);

  return (
    <header className="animate-rise">
      {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
      <h1 className="serif-caps text-40 tracking-[-0.01em] text-balance">{title}</h1>
    </header>
  );
}

/** A labelled value in small print: "СЕРІЯ / 3 дні". */
export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div>
      <p className="kicker text-muted">{label}</p>
      <p className="mt-1 font-display text-20 font-semibold">
        {value}
        {unit && <span className="ml-1 font-sans text-14 font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}
