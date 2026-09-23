import { useEffect } from 'react';

/** The screen's main heading. Also sets the browser tab title, so screen readers announce the page. */
export function PageTitle({ children }: { children: string }) {
  useEffect(() => {
    document.title = `${children} · NeRN`;
  }, [children]);

  return (
    <h1 className="font-display text-28 font-semibold tracking-[-0.01em] text-balance">
      {children}
    </h1>
  );
}
