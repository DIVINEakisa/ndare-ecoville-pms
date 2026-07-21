import { Inbox } from 'lucide-react';
import { motion } from 'framer-motion';

export function EmptyState({
  title,
  message,
  action
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300">
        <Inbox className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
