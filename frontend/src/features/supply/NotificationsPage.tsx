import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { listNotifications, markNotificationRead } from './supplyApi';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => listNotifications({ limit: 50 }) });
  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      toast.success('Notification marked read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not update notification')
  });

  return (
    <div>
      <PageHeader title="Notifications" breadcrumb={['Workspace', 'Notifications']} />
      {notifications.isLoading ? <Skeleton className="h-80" /> : notifications.data?.items.length ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{notifications.data.unread} unread notifications</p>
          </div>
          {notifications.data.items.map((notification) => (
            <article key={notification._id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{notification.title}</h2>
                    {!notification.readAt && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Unread</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {!notification.readAt && (
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-800" onClick={() => mutation.mutate(notification._id)}>
                  <Check className="h-4 w-4" />
                  Read
                </button>
              )}
            </article>
          ))}
        </div>
      ) : <EmptyState title="No notifications" message="Operational alerts and approval updates will appear here." />}
    </div>
  );
}
