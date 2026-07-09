import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Plus, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { StaffUser, UserRole } from '../../types/api';
import { getProperties } from '../dashboard/dashboardApi';
import { createStaffUser, listStaffUsers, type CreateStaffUserInput } from './usersApi';

const roles: UserRole[] = [
  'Owner',
  'Admin',
  'Property Manager',
  'Receptionist',
  'Cashier',
  'Kitchen Staff',
  'Department Staff'
];

export function UsersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const users = useQuery({ queryKey: ['staff-users'], queryFn: listStaffUsers });
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const mutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: (result) => {
      toast.success(`Staff created. Temporary password: ${result.temporaryPassword}`, { duration: 8000 });
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: () => toast.error('Could not create staff account')
  });

  return (
    <div>
      <PageHeader
        title="Users Management"
        breadcrumb={['Workspace', 'Admin', 'Users']}
        actions={
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add New Staff
          </button>
        }
      />

      {users.isLoading ? (
        <Skeleton className="h-96" />
      ) : users.data?.length ? (
        <DataTable<StaffUser>
          rows={users.data}
          columns={[
            { header: 'Name', cell: (user) => <span className="font-semibold text-slate-950 dark:text-white">{user.fullName}</span> },
            { header: 'Email', cell: (user) => user.email },
            { header: 'Role', cell: (user) => <RoleBadge role={user.role} /> },
            {
              header: 'Property',
              cell: (user) => user.assignedPropertyIds.map((property) => property.name).join(', ') || 'No property'
            }
          ]}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300">
            <UserRound className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">No users found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Create staff accounts and assign each person to the right property scope.
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add New Staff
          </button>
        </div>
      )}

      {modalOpen && (
        <CreateStaffModal
          properties={properties.data ?? []}
          isSubmitting={mutation.isPending}
          onClose={() => setModalOpen(false)}
          onSubmit={(input) => mutation.mutate(input)}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800 ring-1 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900">
      {role}
    </span>
  );
}

function CreateStaffModal({
  properties,
  isSubmitting,
  onClose,
  onSubmit
}: {
  properties: Array<{ _id: string; name: string }>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateStaffUserInput) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            fullName: String(form.get('fullName')),
            email: String(form.get('email')),
            role: String(form.get('role')) as UserRole,
            propertyId: String(form.get('propertyId'))
          });
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Add New Staff</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create an account with a temporary password.</p>
          </div>
          <button type="button" className="rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Full Name
            <input name="fullName" required className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email Address
            <input name="email" type="email" required className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Role
              <select name="role" required className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950">
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Property Scope
              <select name="propertyId" required className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950">
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800 disabled:opacity-60">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Staff
          </button>
        </div>
      </motion.form>
    </div>
  );
}
