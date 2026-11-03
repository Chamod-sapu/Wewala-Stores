import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  TrendingUp,
  Star,
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Shield,
  MonitorCheck,
  Bell,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { STORE_CONFIG } from '@wewala/shared';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/sales', label: 'Sales & Revenue', icon: TrendingUp },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/users', label: 'Users & Customers', icon: Users },
];

export function AdminLayout() {
  const { user, profile, logout } = useAdminAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  // Collapsible sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('desktop_sidebar_collapsed') === 'true';
  });

  // Dark mode state
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('desktop_theme');
    return saved ? saved === 'dark' : true;
  });

  // Notification menu popover
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('desktop_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem('desktop_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Click outside to close notification popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Current page title mapping
  const currentNav = NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );
  const pageTitle = currentNav?.label || 'Admin Console';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* ============================================================== */}
      {/* COLLAPSIBLE SIDEBAR                                            */}
      {/* ============================================================== */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 ease-in-out shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-inherit">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <MonitorCheck size={24} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="truncate font-black text-sm tracking-tight block">
                  {STORE_CONFIG.name}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  POS & Operations
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition ${
              collapsed ? 'mx-auto' : ''
            }`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : isDark
                    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Admin Status */}
        <div className="p-3 border-t border-inherit">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                <Shield size={16} />
                <span>Verified Admin Terminal</span>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => logout()}
                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN VIEW AREA                                                 */}
      {/* ============================================================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header
          className={`flex h-16 items-center justify-between px-6 border-b shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Left: Page Title */}
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-extrabold tracking-tight">{pageTitle}</h1>
          </div>

          {/* Right: Actions, Theme Toggle, Notification Bell, Admin Profile */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  if (unreadCount > 0) markAllAsRead();
                }}
                className={`relative rounded-xl p-2 transition border ${
                  isDark
                    ? 'border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Live Orders Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-sm">Realtime Orders</span>
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Check size={12} /> Mark read
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      No notifications yet. New incoming orders will appear here in real-time.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setIsNotificationOpen(false);
                            navigate('/orders');
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition ${
                            n.isRead
                              ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              : 'bg-brand-50/50 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`rounded-xl p-2 transition border ${
                isDark
                  ? 'border-slate-800 bg-slate-800/80 text-amber-400 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* Admin Profile Chip */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Admin'}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-500"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm dark:bg-brand-950 dark:text-brand-300">
                    {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>

              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold truncate max-w-[150px]">
                  {profile?.full_name || 'System Admin'}
                </p>
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Outlet Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
