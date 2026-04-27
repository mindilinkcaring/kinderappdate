import { cn } from '@/lib/utils';

export function Button({ className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 sm:px-6 h-12 sm:h-14 text-sm sm:text-base font-semibold transition-colors active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md',
        className
      )}
      {...props}
    />
  );
}