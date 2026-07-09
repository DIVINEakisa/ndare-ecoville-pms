import { Search } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} breadcrumb={['Workspace', title]} />
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            placeholder={`Search ${title.toLowerCase()}...`}
          />
        </div>
        <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option>All statuses</option>
        </select>
      </div>
      <EmptyState title={`${title} will be built in the next approved phase`} message="The shell, navigation, search, filters, and empty state are ready for the feature implementation." />
    </div>
  );
}
