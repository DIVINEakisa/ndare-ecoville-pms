import {
  BarChart3,
  BedDouble,
  Bell,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Home,
  Menu,
  Package,
  Search,
  Settings,
  Soup,
  SunMoon,
  Users,
  X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Reservations', href: '/reservations', icon: ClipboardList },
  { label: 'Guests', href: '/guests', icon: Users },
  { label: 'Rooms', href: '/rooms', icon: BedDouble },
  { label: 'Restaurant', href: '/restaurant', icon: Soup },
  { label: 'Folios', href: '/folios', icon: CreditCard },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Requisitions', href: '/requisitions', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Settings', href: '/settings', icon: Settings }
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark(document.documentElement.classList.contains('dark'));
  };

  const logout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              NuvraHub
            </p>
            <p className="font-semibold">HMS Workspace</p>
          </div>
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-teal-600 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
              placeholder="Search reservations, guests, folios..."
            />
          </div>

          <button
            className="ml-auto rounded-lg border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 sm:ml-0"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <SunMoon className="h-5 w-5" />
          </button>
          <button className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
          </div>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950" onClick={logout}>
            Sign out
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      {dark ? null : null}
    </div>
  );
}
