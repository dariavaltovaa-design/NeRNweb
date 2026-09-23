import { useEffect, type ReactNode } from 'react';

export interface EditorialTitle {
  caps: string;
  italic: string;
}

/** Small uppercase label above a title or a value. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`kicker text-muted ${className}`}>{children}</p>;
}

/** Light serif capitals with an italic lowercase accent: «ТВОЯ увага.» */
export function Editorial({
  title,
  className = '',
}: {
  title: EditorialTitle;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="serif-caps">{title.caps}</span>{' '}
      <span className="serif-italic">{title.italic}</span>
    </span>
  );
}

/**
 * Screen header: kicker + serif title. Also sets the browser tab title,
 * so screen readers announce the page.
 */
export function PageHeader({
  kicker,
  title,
  documentTitle,
}: {
  kicker?: ReactNode;
  title: string | EditorialTitle;
  documentTitle?: string;
}) {
  const plain = typeof title === 'string' ? title : `${title.caps} ${title.italic}`;
  useEffect(() => {
    document.title = `${documentTitle ?? plain} · NeRN`;
  }, [documentTitle, plain]);

  return (
    <header className="animate-rise">
      {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
      <h1 className="text-40 tracking-[-0.01em] text-balance">
        {typeof title === 'string' ? (
          <span className="serif-caps">{title}</span>
        ) : (
          <Editorial title={title} />
        )}
      </h1>
    </header>
  );
}

/** A labelled value in small print: "ТИПОВА РЕАКЦІЯ / 284 мс". */
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
