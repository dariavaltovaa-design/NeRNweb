import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from './icons';

type Variant = 'primary' | 'secondary' | 'quiet';

const BASE =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-button text-16 font-medium ' +
  'transition-[opacity,background-color,color] duration-160 ease-out active:opacity-75 ' +
  'disabled:pointer-events-none disabled:opacity-40';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cta px-6 text-on-cta',
  secondary: 'px-6 text-text ring-1 ring-hairline ring-inset hover:bg-surface',
  quiet:
    'px-0 text-text underline decoration-hairline underline-offset-[6px] hover:decoration-text',
};

interface CommonProps {
  variant?: Variant;
  /** Adds an arrow that nudges right on hover — for "go somewhere" actions. */
  arrow?: boolean;
  wide?: boolean;
  children: ReactNode;
}

function Content({ arrow, children }: { arrow?: boolean; children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      {arrow && (
        <ArrowRight className="transition-transform duration-160 ease-out group-hover:translate-x-1" />
      )}
    </>
  );
}

export function ButtonLink({
  to,
  variant = 'primary',
  arrow,
  wide,
  children,
}: CommonProps & { to: string }) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${wide ? 'w-full' : ''}`}>
      <Content arrow={arrow}>{children}</Content>
    </Link>
  );
}

export function Button({
  onClick,
  variant = 'primary',
  arrow,
  wide,
  disabled,
  type = 'button',
  children,
}: CommonProps & { onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} ${VARIANTS[variant]} ${wide ? 'w-full' : ''}`}
    >
      <Content arrow={arrow}>{children}</Content>
    </button>
  );
}
