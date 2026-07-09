import { Outlet } from 'react-router-dom';

export function GuestPortalLayout() {
  return (
    <main className="min-h-screen bg-lime-700 text-slate-950 dark:bg-lime-950 dark:text-slate-100">
      <Outlet />
    </main>
  );
}
