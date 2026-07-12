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
  QrCode,
  Search,
  Settings,
  Soup,
  SunMoon,
  ChefHat,
  UserCog,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { listNotifications } from '../features/supply/supplyApi';
import type { UserRole } from '../types/api';

// ─── Nav item definition ───────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Roles explicitly allowed. Omit to allow all roles. */
  roles?: UserRole[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// Every possible nav item with its role allowlist.
// Roles NOT listed in `roles` will not see that item.
const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home
        // All roles see the dashboard
      },
      {
        label: 'Reservations',
        href: '/reservations',
        icon: ClipboardList,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist', 'Cashier']
      },
      {
        label: 'Guests',
        href: '/guests',
        icon: Users,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist', 'Cashier']
      },
      {
        label: 'Rooms',
        href: '/rooms',
        icon: BedDouble,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist']
      },
      {
        label: 'Check-in',
        href: '/check-in',
        icon: LogIn,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist']
      },
      {
        label: 'Check-out',
        href: '/check-out',
        icon: LogOut,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist']
      }
    ]
  },
  {
    label: 'Services',
    items: [
      {
        label: 'Restaurant',
        href: '/restaurant',
        icon: Soup,
        roles: ['Owner', 'Admin', 'Property Manager', 'Receptionist', 'Cashier', 'Kitchen Staff']
      },
      {
        label: 'Kitchen',
        href: '/kitchen',
        icon: ChefHat,
        roles: ['Owner', 'Admin', 'Property Manager', 'Kitchen Staff']
      },
      {
        label: 'Folios',
        href: '/folios',
        icon: CreditCard,
        roles: ['Owner', 'Admin', 'Property Manager', 'Cashier']
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Package,
        roles: ['Owner', 'Admin', 'Property Manager', 'Kitchen Staff', 'Department Staff']
      },
      {
        label: 'Requisitions',
        href: '/requisitions',
        icon: BarChart3,
        roles: ['Owner', 'Admin', 'Property Manager', 'Kitchen Staff', 'Department Staff']
      }
    ]
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell
        // All roles see notifications
      },
      {
        label: 'Users',
        href: '/dashboard/users',
        icon: UserCog,
        roles: ['Owner']
      },
      {
        label: 'QR Management',
        href: '/qr-management',
        icon: QrCode,
        roles: ['Owner', 'Admin', 'Property Manager']
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: FileBarChart,
        roles: ['Owner', 'Admin', 'Property Manager']
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['Owner', 'Admin', 'Property Manager']
      }
    ]
  }
];

/** Returns nav groups with items filtered to only those the given role can access. */
function getNavGroupsForRole(role: UserRole | undefined): NavGroup[] {
  return ALL_NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role && item.roles.includes(role))
      )
    }))
    .filter((group) => group.items.length > 0);
}

// ─── Sidebar inner content — shared between mobile overlay and desktop fixed ──
function SidebarContent({
  user,
  onClose
}: {
  user: { fullName?: string; role?: UserRole } | null;
  onClose: () => void;
}) {
  const navGroups = getNavGroupsForRole(user?.role);

  return (
    <>
      {/* Brand header */}
      <div className="flex min-h-[72px] items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-700 text-base font-bold shadow-lg shadow-lime-950/40">
            NH
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Ndare Ecoville</p>
            <p className="text-sm font-semibold leading-tight">Ndare PMS</p>
            <p className="text-xs text-slate-400">Ecoville & Property 2</p>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav links — filtered to role */}
      <nav className="sidebar-nav flex-1 space-y-7 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
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

      {/* Footer — show role badge so staff always know their access level */}
      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold">Premium workspace</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Multi-property operations with strict property scope.
        </p>
        {user?.role && (
          <span className="mt-3 inline-block rounded-full bg-lime-700/20 px-2.5 py-0.5 text-[11px] font-semibold text-lime-300">
            {user.role}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Poll unread notifications count so the bell badge stays current
  const notifQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => listNotifications({ limit: 1, unreadOnly: true }),
    refetchInterval: 15_000, // refresh every 15 s
    staleTime: 10_000,
  });
  const unreadCount = notifQuery.data?.unread ?? 0;

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark(document.documentElement.classList.contains('dark'));
  };

  const logout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">

      {/* ── MOBILE: backdrop overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── MOBILE: animated sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white shadow-2xl shadow-slate-950/40 md:hidden"
          >
            <SidebarContent user={user} onClose={closeSidebar} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── DESKTOP: permanently pinned sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-900 text-white shadow-2xl shadow-slate-950/30 md:flex">
        <SidebarContent user={user} onClose={closeSidebar} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex min-h-screen flex-col md:pl-72">

        {/* ── MOBILE: top bar with hamburger ── */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <button
            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-700 text-xs font-bold text-white">
              NH
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Ndare PMS</span>
          </div>
          {/* Notifications shortcut on mobile */}
          <button
            className="relative rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* ── DESKTOP: full top bar ── */}
        <header className="sticky top-0 z-30 hidden h-[72px] items-center gap-4 border-b border-slate-200 bg-white px-8 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950 md:flex">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-4 text-sm text-slate-950 outline-none ring-lime-700 transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="Search reservations, guests, folios..."
            />
          </div>

          {/* Property selector */}
          <select className="hidden h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none ring-lime-700 transition-colors focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 xl:block">
            <option>All properties</option>
            <option>Ndare Ecoville</option>
            <option>Property 2</option>
          </select>

          {/* Theme toggle */}
          <button
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <SunMoon className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button
            className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User info */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-950 text-sm font-semibold text-white shadow-md">
              {user?.fullName?.slice(0, 1) ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            className="shrink-0 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors hover:bg-lime-800"
            onClick={logout}
          >
            Sign out
          </button>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {dark ? null : null}
    </div>
  );
}
