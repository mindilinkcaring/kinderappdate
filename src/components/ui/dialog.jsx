import { useEffect } from 'react';

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    function onEsc(event) {
      if (event.key === 'Escape') onOpenChange?.(false);
    }
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onOpenChange?.(false)}>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }) {
  return <div className="mb-3">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h3 className="text-lg font-bold text-slate-800">{children}</h3>;
}

export function DialogContent({ children }) {
  return <div>{children}</div>;
}