import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Close } from './icons';

/**
 * A modal sheet on the native <dialog>: focus is trapped, Esc closes, the page behind is inert.
 * Slides up from the bottom on phones, centred on wide screens.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Full-screen (e.g. the expanded chart). */
  full?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { m } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={
        'm-0 max-h-none max-w-none bg-transparent p-0 text-text backdrop:bg-scrim ' +
        (full ? 'h-dvh w-full' : 'mt-auto w-full sm:m-auto sm:max-w-[440px]')
      }
    >
      <div
        className={
          'animate-rise bg-bg ' +
          (full
            ? 'flex h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+16px)]'
            : 'rounded-t-card px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] ring-1 ring-hairline sm:rounded-card')
        }
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="serif-caps pt-2 text-28">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.common.close}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-text"
          >
            <Close />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
