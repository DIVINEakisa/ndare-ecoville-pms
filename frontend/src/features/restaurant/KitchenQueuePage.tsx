import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { listOrders, updateOrderStatus, type RestaurantOrder } from './restaurantApi';

const lanes: RestaurantOrder['status'][] = ['Received', 'Preparing', 'Ready', 'Delivered'];

export function KitchenQueuePage() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ['kitchen-orders'], queryFn: () => listOrders({ limit: 100 }) });
  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not update order')
  });

  const nextStatus = (status: RestaurantOrder['status']): RestaurantOrder['status'] | null => {
    if (status === 'Received') return 'Preparing';
    if (status === 'Preparing') return 'Ready';
    if (status === 'Ready') return 'Delivered';
    return null;
  };

  return (
    <div>
      <PageHeader title="Kitchen Queue" breadcrumb={['Workspace', 'Kitchen']} />
      {orders.isLoading ? <Skeleton className="h-80" /> : orders.data?.items.length ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {lanes.map((lane) => (
            <section key={lane} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{lane}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                  {orders.data.items.filter((order) => order.status === lane).length}
                </span>
              </div>
              <div className="space-y-3">
                {orders.data.items.filter((order) => order.status === lane).map((order) => {
                  const next = nextStatus(order.status);
                  return (
                    <article key={order._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                      </p>
                      {next && (
                        <button className="mt-3 w-full rounded-lg bg-lime-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => mutation.mutate({ id: order._id, status: next })}>
                          Mark {next}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : <EmptyState title="No kitchen orders" message="New restaurant orders will appear in the Received lane." />}
    </div>
  );
}
