import type { LucideIcon } from 'lucide-react';

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'teal'
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: 'teal' | 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
    </article>
  );
}
