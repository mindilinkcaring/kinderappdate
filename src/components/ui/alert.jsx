import { cn } from '@/lib/utils';

export function Alert({ className, ...props }) {
  return <div role="alert" className={cn('rounded-xl border px-4 py-3 text-sm sm:text-base', className)} {...props} />;
}