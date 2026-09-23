// Motion, kept small and purposeful. Everything respects prefers-reduced-motion.

import { useEffect, useRef, useState, type ReactNode } from 'react';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Rises into place when it enters the screen (once). */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'p';
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      className={className}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** A number in fixed-width digit cells (Fixel's figures are proportional). */
export function Digits({ value, className = '' }: { value: number | string; className?: string }) {
  return (
    <span className={`digits ${className}`}>
      {String(value)
        .split('')
        .map((d, i) => (
          <span key={i}>{d}</span>
        ))}
    </span>
  );
}

/**
 * The test counter as a demo: runs up from 0, stops on a plausible reaction (240–340 ms),
 * holds for a moment, repeats. Static with reduced motion.
 */
export function RunningCounter({ className = '' }: { className?: string }) {
  const [value, setValue] = useState(284);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let timer = 0;
    const run = () => {
      const stopAt = 240 + Math.round(Math.random() * 100);
      const start = performance.now();
      const tick = (now: number) => {
        const ms = Math.min(stopAt, Math.floor(now - start));
        setValue(ms);
        if (ms < stopAt) frame = requestAnimationFrame(tick);
        else
          timer = window.setTimeout(() => {
            setValue(0);
            timer = window.setTimeout(run, 900);
          }, 1600);
      };
      frame = requestAnimationFrame(tick);
    };
    timer = window.setTimeout(run, 600);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  return <Digits value={value} className={className} />;
}

/** Counts up from 0 to `to` once (the result number). */
export function CountUp({
  to,
  duration = 700,
  className = '',
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? to : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);
  return <Digits value={value} className={className} />;
}

/** Lumen-style running strip of words. */
export function Marquee({ items }: { items: readonly string[] }) {
  const row = items.map((item) => (
    <span key={item} className="flex shrink-0 items-center gap-8 pr-8">
      <span>{item}</span>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-hairline py-5" aria-label={items.join(', ')}>
      <div className="animate-marquee flex w-max kicker text-14 text-text" aria-hidden="true">
        {row}
        {row}
      </div>
    </div>
  );
}
