import {
  BarChart3,
  BedDouble,
  Bell,
  LogIn,
  LogOut,
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
  ChefHat,
  UserCog,
  Users,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Reservations', href: '/reservations', icon: ClipboardList },
      { label: 'Guests', href: '/guests', icon: Users },
      { label: 'Rooms', href: '/rooms', icon: BedDouble },
      { label: 'Check-in', href: '/check-in', icon: LogIn },
      { label: 'Check-out', href: '/check-out', icon: LogOut }
    ]
  },
  {
    label: 'Services',
    items: [
      { label: 'Restaurant', href: '/restaurant', icon: Soup },
      { label: 'Kitchen', href: '/kitchen', icon: ChefHat },
      { label: 'Folios', href: '/folios', icon: CreditCard },
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Requisitions', href: '/requisitions', icon: BarChart3 }
    ]
  },
  {
    label: 'Admin',
    items: [
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Users', href: '/dashboard/users', icon: UserCog, ownerOnly: true },
      { label: 'Reports', href: '/reports', icon: FileBarChart },
      { label: 'Settings', href: '/settings', icon: Settings }
    ]
  }
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
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-white shadow-2xl shadow-slate-950/30 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-[88px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-700 text-lg font-bold shadow-lg shadow-lime-950/40">
              NH
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">NuvraHub</p>
              <p className="font-semibold leading-tight">Ndare PMS</p>
              <p className="text-xs text-slate-400">Ecoville & Property 2</p>
            </div>
          </div>
          <button className="rounded-xl p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.filter((item) => !item.ownerOnly || user?.role === 'Owner').map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-lime-700 text-white shadow-lg shadow-lime-950/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">Premium workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Multi-property operations with strict property scope.</p>
        </div>
      </motion.aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white px-4 text-slate-950 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-8">
          <button className="rounded-2xl border border-slate-200 p-2 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 md:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-4 text-sm text-slate-950 outline-none ring-lime-700 transition-colors duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="Search reservations, guests, folios..."
            />
          </div>

          <select className="hidden h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 xl:block">
            <option>All properties</option>
            <option>Ndare Ecoville</option>
            <option>Property 2</option>
          </select>
          <button
            className="ml-auto rounded-2xl border border-slate-200 p-2.5 text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 sm:ml-0"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <SunMoon className="h-5 w-5" />
          </button>
          <button className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900" aria-label="Notifications" onClick={() => navigate('/notifications')}>
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-700" />
          </button>
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-950 text-sm font-semibold text-white shadow-md">
              {user?.fullName?.slice(0, 1) ?? 'U'}
            </div>
            <div>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button className="rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800" onClick={logout}>
            Sign out
          </button>
        </header>

        <main className="min-h-[calc(100vh-72px)] bg-slate-50 p-5 dark:bg-slate-950 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
      {dark ? null : null}
    </div>
  );
}
