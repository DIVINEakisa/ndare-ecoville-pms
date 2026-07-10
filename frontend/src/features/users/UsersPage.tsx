import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, Plus, UserCheck, UserRound, UserX, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { StaffUser, UserRole } from '../../types/api';
import { useAuth } from '../auth/AuthProvider';
import { getProperties } from '../dashboard/dashboardApi';
import {
  createStaffUser,
  listStaffUsers,
  toggleStaffStatus,
  type CreateStaffUserInput
} from './usersApi';

const roles: UserRole[] = [
  'Owner',
  'Admin',
  'Property Manager',
  'Receptionist',
  'Cashier',
  'Kitchen Staff',
  'Department Staff'
];

// ─── Page ──────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<StaffUser | null>(null);

  const usersQuery      = useQuery({ queryKey: ['staff-users'], queryFn: listStaffUsers });
  const propertiesQuery = useQuery({ queryKey: ['properties'],  queryFn: getProperties });

  const createMutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: () => {
      toast.success('Staff account created. An invitation email has been sent.');
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: () => toast.error('Could not create staff account')
  });

  const toggleMutation = useMutation({
    mutationFn: (userId: string) => toggleStaffStatus(userId),
    onSuccess: (result) => {
      const verb = result.isActive ? 'reactivated' : 'deactivated';
      toast.success(`${result.fullName} has been ${verb}.`);
      setToggleTarget(null);
      // Optimistically flip isActive in the cached list — no refetch needed
      queryClient.setQueryData<StaffUser[]>(['staff-users'], (prev) =>
        prev?.map((u) =>
          u._id === result.id ? { ...u, isActive: result.isActive } : u
        ) ?? []
      );
    },
    onError: () => toast.error('Could not update staff status. Please try again.')
  });

  return (
    <div>
      <PageHeader
        title="Users Management"
        breadcrumb={['Workspace', 'Admin', 'Users']}
        actions={
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add New Staff
          </button>
        }
      />

      {/* ── Staff table ── */}
      {usersQuery.isLoading ? (
        <Skeleton className="h-96" />
      ) : usersQuery.data?.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {['Name', 'Email', 'Role', 'Property', 'Status', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 ${
                      i === 5 ? 'text-right' : 'text-left'
                    } ${i === 1 ? 'hidden sm:table-cell' : ''} ${i === 3 ? 'hidden lg:table-cell' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersQuery.data.map((staffUser) => {
                const isSelf = staffUser._id === currentUser?.id;
                return (
                  <tr
                    key={staffUser._id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      !staffUser.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white ${staffUser.isActive ? 'bg-lime-950' : 'bg-slate-400'}`}>
                          {staffUser.fullName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {staffUser.fullName}
                            {isSelf && (
                              <span className="ml-2 rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime-700 dark:bg-lime-950 dark:text-lime-300">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                            {staffUser.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="hidden px-6 py-4 text-slate-600 dark:text-slate-400 sm:table-cell">
                      {staffUser.email}
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <RoleBadge role={staffUser.role} />
                    </td>

                    {/* Property */}
                    <td className="hidden px-6 py-4 text-slate-600 dark:text-slate-400 lg:table-cell">
                      {staffUser.assignedPropertyIds.map((p) => p.name).join(', ') || '—'}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <StatusBadge isActive={staffUser.isActive} />
                    </td>

                    {/* Toggle action — hidden for own row */}
                    <td className="px-6 py-4 text-right">
                      {!isSelf && (
                        <ToggleButton
                          isActive={staffUser.isActive}
                          onClick={() => setToggleTarget(staffUser)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyStaff onAdd={() => setCreateModalOpen(true)} />
      )}

      {/* ── Create modal ── */}
      {createModalOpen && (
        <CreateStaffModal
          properties={propertiesQuery.data ?? []}
          isSubmitting={createMutation.isPending}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(input) => createMutation.mutate(input)}
        />
      )}

      {/* ── Toggle confirmation modal ── */}
      <AnimatePresence>
        {toggleTarget && (
          <ToggleStatusModal
            staffUser={toggleTarget}
            isSubmitting={toggleMutation.isPending}
            onClose={() => setToggleTarget(null)}
            onConfirm={() => toggleMutation.mutate(toggleTarget._id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900'
          : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Toggle button ─────────────────────────────────────────────────────────

function ToggleButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return isActive ? (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
    >
      <UserX className="h-3.5 w-3.5" />
      Deactivate
    </button>
  ) : (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950"
    >
      <UserCheck className="h-3.5 w-3.5" />
      Reactivate
    </button>
  );
}

// ─── Role badge ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800 ring-1 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900">
      {role}
    </span>
  );
}

// ─── Toggle status confirmation modal ─────────────────────────────────────

function ToggleStatusModal({
  staffUser,
  isSubmitting,
  onClose,
  onConfirm
}: {
  staffUser: StaffUser;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDeactivating = staffUser.isActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        {/* Icon + close */}
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isDeactivating
              ? 'bg-red-50 dark:bg-red-950/50'
              : 'bg-emerald-50 dark:bg-emerald-950/50'
          }`}>
            {isDeactivating
              ? <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
              : <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            }
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            {isDeactivating ? 'Deactivate' : 'Reactivate'} staff member?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            You are about to{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {isDeactivating ? 'deactivate' : 'reactivate'}
            </span>{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {staffUser.fullName}
            </span>{' '}
            ({staffUser.email}).{' '}
            {isDeactivating
              ? 'They will be signed out immediately and will no longer be able to access the workspace.'
              : 'They will regain access to the workspace immediately using their existing credentials.'
            }
          </p>
        </div>

        {/* Contextual notice */}
        {isDeactivating && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
              All active sessions will be revoked and any pending activation links will
              be invalidated immediately. Their profile and history are preserved.
            </p>
          </div>
        )}

        {!isDeactivating && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs leading-5 text-emerald-700 dark:text-emerald-300">
              The staff member's profile, role, and historical data will be fully restored.
              They can sign in immediately with their existing password.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors disabled:opacity-60 ${
              isDeactivating
                ? 'bg-red-600 shadow-red-600/20 hover:bg-red-700'
                : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isDeactivating ? 'Deactivating…' : 'Reactivating…'}
              </>
            ) : (
              <>
                {isDeactivating
                  ? <UserX className="h-4 w-4" />
                  : <UserCheck className="h-4 w-4" />
                }
                Yes, {isDeactivating ? 'deactivate' : 'reactivate'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyStaff({ onAdd }: { onAdd: () => void }) {
  return (
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
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Add New Staff
      </button>
    </div>
  );
}

// ─── Create staff modal ────────────────────────────────────────────────────

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
            email:    String(form.get('email')),
            role:     String(form.get('role')) as UserRole,
            propertyId: String(form.get('propertyId'))
          });
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Add New Staff</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create an account with a temporary password.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
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
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Property Scope
              <select name="propertyId" required className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950">
                <option value="">Select property</option>
                {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
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
