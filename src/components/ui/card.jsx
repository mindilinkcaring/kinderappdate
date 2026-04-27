import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl bg-white/90 shadow-sm border border-slate-100', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('p-4 sm:p-6', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-4 pb-4 sm:px-6 sm:pb-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h1 className={cn('text-lg sm:text-2xl font-bold text-slate-800', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm sm:text-base text-slate-600 mt-1', className)} {...props} />;
}