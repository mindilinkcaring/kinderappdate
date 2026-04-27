import { cn } from '@/lib/utils';

export function Tabs({ children, className }) {
  return <div className={cn('space-y-3 sm:space-y-4', className)}>{children}</div>;
}

export function TabsList({ children, className }) {
  return <div className={cn('flex gap-1 sm:gap-2 overflow-x-auto pb-2', className)}>{children}</div>;
}

export function TabsTrigger({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-lg sm:rounded-xl border px-3 sm:px-4 h-9 sm:h-10 text-xs sm:text-sm font-medium transition-colors active:opacity-80',
        isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children }) {
  return <div className="mt-3 sm:mt-4">{children}</div>;
}