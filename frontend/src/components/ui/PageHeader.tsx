import type { ReactNode } from 'react';

export function PageHeader({
  title,
  breadcrumb,
  actions
}: {
  title: string;
  breadcrumb: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {breadcrumb.map((item, index) => (
            <span key={item} className="flex items-center gap-2">
              {index > 0 && <span>/</span>}
              <span>{item}</span>
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
