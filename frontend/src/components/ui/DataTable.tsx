import type { ReactNode } from 'react';

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
};

export function DataTable<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
      <div className="max-h-[640px] overflow-auto rounded-xl">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-950/95">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr key={index} className="transition hover:bg-lime-50/50 dark:hover:bg-slate-800/70">
                {columns.map((column) => (
                  <td key={column.header} className="whitespace-nowrap px-5 py-4 text-slate-700 dark:text-slate-200">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{rows.length} records</span>
        <span>Page 1</span>
      </div>
    </div>
  );
}
