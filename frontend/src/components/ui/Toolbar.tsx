import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function Toolbar({
  search,
  onSearch,
  children
}: {
  search: string;
  onSearch: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 lg:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-lime-700 transition focus:bg-white focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          placeholder="Search..."
        />
      </div>
      {children}
    </div>
  );
}
