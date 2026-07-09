import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'lime'
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: 'lime' | 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const tones = {
    lime: 'bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  };

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
    </motion.article>
  );
}
