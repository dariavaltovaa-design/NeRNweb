import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary';

const BASE =
  'inline-flex min-h-12 items-center justify-center rounded-button px-5 text-16 font-medium ' +
  'transition-opacity duration-160 ease-out active:opacity-75';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'text-text ring-1 ring-hairline ring-inset',
};

interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  children: ReactNode;
}

/** A link that looks like a button: used when pressing it opens another screen. */
export function ButtonLink({ to, variant = 'primary', children }: ButtonLinkProps) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]}`}>
      {children}
    </Link>
  );
}

interface ButtonProps {
  onClick: () => void;
  variant?: Variant;
  children: ReactNode;
}

export function Button({ onClick, variant = 'primary', children }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} className={`${BASE} ${VARIANTS[variant]}`}>
      {children}
    </button>
  );
}
