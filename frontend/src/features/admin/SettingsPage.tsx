import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProperty } from '../../contexts/PropertyContext';
import { listEmailTemplates, listSettings, saveEmailTemplate, saveSetting } from './adminApi';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const settings = useQuery({ queryKey: ['settings', propertyId], queryFn: () => listSettings({ propertyId }) });
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: listEmailTemplates });
  const settingMutation = useMutation({
    mutationFn: saveSetting,
    onSuccess: () => {
      toast.success('Setting saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Could not save setting')
  });
  const templateMutation = useMutation({
    mutationFn: saveEmailTemplate,
    onSuccess: () => {
      toast.success('Email template saved');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: () => toast.error('Could not save email template')
  });

  return (
    <div>
      <PageHeader title="Settings" breadcrumb={['Workspace', 'Settings']} />
      {!propertyId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Select a property from the top bar to view and edit its settings.
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">System configuration</h2>
          <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            settingMutation.mutate({
              propertyId: String(form.get('propertyId')),
              key: String(form.get('key')),
              value: String(form.get('value')),
              description: String(form.get('description'))
            });
          }}>
            <input name="propertyId" type="hidden" value={propertyId} />
            <input name="key" required placeholder="Key, e.g. taxRate" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="value" required placeholder="Value" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="description" placeholder="Description" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <button disabled={!propertyId} className="flex items-center justify-center gap-2 rounded-lg bg-lime-700 px-4 py-2 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Save setting</button>
          </form>
          {settings.isLoading ? <Skeleton className="h-64" /> : settings.data?.length ? (
            <DataTable rows={settings.data} columns={[
              { header: 'Key', cell: (setting) => setting.key },
              { header: 'Value', cell: (setting) => String(setting.value) },
              { header: 'Description', cell: (setting) => setting.description || 'Not set' }
            ]} />
          ) : <EmptyState title="No settings" message="Select a property or create configuration values." />}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Email templates</h2>
          <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            templateMutation.mutate({
              propertyId: String(form.get('propertyId')),
              key: String(form.get('key')),
              name: String(form.get('name')),
              subject: String(form.get('subject')),
              bodyText: String(form.get('bodyText')),
              bodyHtml: String(form.get('bodyHtml')),
              isActive: true
            });
          }}>
            <input name="propertyId" type="hidden" value={propertyId} />
            <input name="key" required placeholder="Key, e.g. receipt" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="name" required placeholder="Template name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="subject" required placeholder="Subject" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <textarea name="bodyText" required placeholder="Plain text body" className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <textarea name="bodyHtml" required placeholder="HTML body" className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <button disabled={!propertyId} className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"><Save className="h-4 w-4" />Save template</button>
          </form>
          {templates.data?.length ? (
            <DataTable rows={templates.data} columns={[
              { header: 'Key', cell: (template) => template.key },
              { header: 'Name', cell: (template) => template.name },
              { header: 'Subject', cell: (template) => template.subject },
              { header: 'Active', cell: (template) => template.isActive ? 'Yes' : 'No' }
            ]} />
          ) : <EmptyState title="No email templates" message="Receipt and notification templates will appear here." />}
        </div>
      </section>
    </div>
  );
}
