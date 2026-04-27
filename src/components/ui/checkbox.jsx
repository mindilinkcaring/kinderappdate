import { cn } from '@/lib/utils';

export function Checkbox({ checked, onCheckedChange, className, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'h-6 w-6 rounded border border-slate-300 flex items-center justify-center',
        checked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white',
        className
      )}
      {...props}
    >
      {checked ? '✓' : ''}
    </button>
  );
}