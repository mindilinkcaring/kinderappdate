import { cn } from '@/lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-gradient-to-l from-slate-50 to-blue-50 px-4 text-base sm:text-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all',
        className
      )}
      {...props}
    />
  );
}