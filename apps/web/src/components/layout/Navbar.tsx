import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, Sun, Moon, Monitor, Menu, X, User,
  LogOut, Package, Heart, ChevronDown, Leaf,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeStore } from '@/store/themeStore';
import { useCartStore } from '@/store/cartStore';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useThemeStore();
  const { totalItems, toggleCart } = useCartStore();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartCount = totalItems();

  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  }

  const themeIcons: Record<string, React.ReactNode> = {
    light: <Sun size={16} />,
    dark: <Moon size={16} />,
    system: <Monitor size={16} />,
  };

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  const navLinks = [
    { to: '/products', label: 'Shop' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 print:hidden">
      <div className="section-container">
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Leaf className="text-brand-600 dark:text-brand-400" size={22} />
            <span className="text-lg tracking-tight">Wewala<span className="text-brand-600 dark:text-brand-400">.</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-56 pl-9 pr-3 py-1.5 text-sm"
            />
          </form>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            className="btn-ghost rounded-full p-2"
          >
            {themeIcons[theme]}
          </button>

          {/* Cart */}
          <button
            onClick={toggleCart}
            aria-label={`Cart (${cartCount} items)`}
            className="btn-ghost relative rounded-full p-2"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* User menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="btn-ghost flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 sm:py-1.5 sm:pl-1.5 sm:pr-3 text-sm"
                aria-expanded={userMenuOpen}
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-700 ring-2 ring-brand-500/20 dark:bg-brand-900 dark:text-brand-300">
                  <span className="text-xs font-bold">
                    {profile?.full_name?.[0]?.toUpperCase() ?? <User size={14} />}
                  </span>
                  {avatarUrl && (
                    <img
                      src={avatarUrl}
                      alt={profile?.full_name || 'User avatar'}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <span className="hidden max-w-24 truncate sm:block">
                  {profile?.full_name?.split(' ')[0] ?? 'Account'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="card absolute right-0 top-full mt-2 w-56 overflow-hidden p-1 shadow-lg">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-700 ring-2 ring-brand-500/20 dark:bg-brand-900 dark:text-brand-300">
                      <span className="text-sm font-bold">
                        {profile?.full_name?.[0]?.toUpperCase() ?? <User size={15} />}
                      </span>
                      {avatarUrl && (
                        <img
                          src={avatarUrl}
                          alt={profile?.full_name || 'User avatar'}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {profile?.full_name ?? 'User'}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {[
                      { to: '/account', label: 'My Account', icon: User },
                      { to: '/account?tab=orders', label: 'Orders', icon: Package },
                      { to: '/account?tab=wishlist', label: 'Wishlist', icon: Heart },
                    ].map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    ))}
                    <hr className="my-1 border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/signup" className="btn-primary text-sm">Sign Up</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="btn-ghost rounded-full p-2 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <form onSubmit={handleSearch} className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </form>
          <nav className="mt-3 space-y-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {user ? (
              <>
                <hr className="border-slate-200 dark:border-slate-800" />
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60 my-1">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-700 ring-2 ring-brand-500/20 dark:bg-brand-900 dark:text-brand-300">
                    <span className="text-sm font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() ?? <User size={16} />}
                    </span>
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt={profile?.full_name || 'User avatar'}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <User size={15} />
                  My Account
                </Link>
                <Link
                  to="/account?tab=orders"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Package size={15} />
                  Orders
                </Link>
                <Link
                  to="/account?tab=wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Heart size={15} />
                  Wishlist
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <hr className="border-slate-200 dark:border-slate-800" />
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary mt-1 w-full text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

