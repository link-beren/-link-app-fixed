import type { HTMLAttributes, ReactNode } from 'react';

export const cardClassName =
  'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${cardClassName} ${className}`} {...props} />;
}

export function CardStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      {sub ? <span className="text-xs text-slate-500 dark:text-slate-400">{sub}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action}
    </Card>
  );
}
