import { Inbox } from 'lucide-react';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
