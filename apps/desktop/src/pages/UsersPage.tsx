import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Inbox,
  Search,
  Filter,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle2,
  DollarSign,
  ShoppingBag,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Calendar,
  User,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, OrderStatus, PaymentMethod, isOrderVisibleInAdmin } from '@wewala/shared';
import type { UserWithStats, Address, Order } from '@wewala/shared';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { UserDetailDrawer } from '@/components/users/UserDetailDrawer';
import { ContactMessagesInbox } from '@/components/users/ContactMessagesInbox';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { OrderInvoicePrint, PrintOrderData } from '@/components/orders/OrderInvoicePrint';
import { OrderPackingSlipPrint } from '@/components/orders/OrderPackingSlipPrint';

const formatPrice = (val: number) =>
  `${STORE_CONFIG.currencySymbol} ${Number(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function UsersPage() {
  const { user: currentAdminUser } = useAdminAuth();

  // Top View Mode: 'users' or 'inbox'
  const [activeTab, setActiveTab] = useState<'users' | 'inbox'>('users');
  const [unreadInquiriesCount, setUnreadInquiriesCount] = useState(0);

  // Users Data
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'spend' | 'orders' | 'name'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer states
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  // Order Details Drawer (if clicked from user history)
  const [selectedOrder, setSelectedOrder] = useState<PrintOrderData | null>(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<{
    order: PrintOrderData;
    type: 'invoice' | 'packingslip';
  } | null>(null);

  // Fetch Users and Aggregate Metrics
  const fetchUsersData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, ordersRes, addressesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('user_id, total, status, created_at, payment_method, payment_status'),
        supabase
          .from('addresses')
          .select('user_id'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const rawProfiles = profilesRes.data || [];
      const rawOrders = (ordersRes.data || []).filter(isOrderVisibleInAdmin);
      const rawAddresses = addressesRes.data || [];

      // Map metrics per user
      const usersWithMetrics: UserWithStats[] = rawProfiles.map((p: any) => {
        const userOrders = rawOrders.filter((o: any) => o.user_id === p.id);
        const nonCancelled = userOrders.filter((o: any) => o.status !== 'cancelled');
        const totalSpent = nonCancelled.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
        const completedCount = userOrders.filter((o: any) =>
          ['delivered', 'paid', 'completed'].includes(o.status)
        ).length;
        const pendingCount = userOrders.filter((o: any) =>
          ['pending', 'processing', 'shipped'].includes(o.status)
        ).length;
        const cancelledCount = userOrders.filter((o: any) => o.status === 'cancelled').length;
        const addressesCount = rawAddresses.filter((a: any) => a.user_id === p.id).length;

        // Last order date
        const sortedOrderDates = userOrders
          .map((o: any) => o.created_at)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

        return {
          ...p,
          email: p.email || null,
          is_disabled: Boolean(p.is_disabled),
          orders_count: userOrders.length,
          total_spent: totalSpent,
          completed_orders: completedCount,
          pending_orders: pendingCount,
          cancelled_orders: cancelledCount,
          addresses_count: addressesCount,
          last_order_at: sortedOrderDates[0] || null,
        };
      });

      setUsers(usersWithMetrics);

      // Keep drawer user synced if open
      if (selectedUser) {
        const updated = usersWithMetrics.find((u) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err: any) {
      console.warn('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Update Role (Promote or Demote)
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'customer') => {
    if (userId === currentAdminUser?.id) {
      alert('You cannot alter the administrative role of your own logged-in account.');
      return;
    }

    try {
      // 1. Try RPC
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        p_user_id: userId,
        p_new_role: newRole,
      });

      if (error || !data?.success) {
        // Fallback: direct table update (enforced by RLS)
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateErr) throw updateErr;
      }

      // Optimistic state update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
      }
    } catch (err: any) {
      throw new Error(err.message || 'Could not update role.');
    }
  };

  // Toggle Account Status (Enable / Disable)
  const handleToggleStatus = async (userId: string, isDisabled: boolean) => {
    if (userId === currentAdminUser?.id) {
      alert('You cannot disable your own active administrator account.');
      return;
    }

    try {
      // 1. Try RPC
      const { data, error } = await supabase.rpc('admin_toggle_user_status', {
        p_user_id: userId,
        p_is_disabled: isDisabled,
      });

      if (error || !data?.success) {
        // Fallback: direct table update (enforced by RLS)
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            is_disabled: isDisabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateErr) throw updateErr;
      }

      // Optimistic state update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_disabled: isDisabled } : u))
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, is_disabled: isDisabled } : null));
      }
    } catch (err: any) {
      throw new Error(err.message || 'Could not change account status.');
    }
  };

  // Open Order Details in drawer from customer drawer
  const handleViewOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product:products (
              name,
              sku,
              product_images (url)
            )
          ),
          profile:profiles (
            full_name,
            phone,
            avatar_url
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (error || !data) throw error;
      setSelectedOrder(data as unknown as PrintOrderData);
      setIsOrderDrawerOpen(true);
    } catch (err: any) {
      alert(`Could not load order details: ${err.message || err}`);
    }
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const customerCount = totalUsers - adminCount;
    const disabledCount = users.filter((u) => u.is_disabled).length;
    const activeCount = totalUsers - disabledCount;
    const storeLifetimeSpend = users.reduce((sum, u) => sum + (u.total_spent || 0), 0);

    return {
      totalUsers,
      adminCount,
      customerCount,
      disabledCount,
      activeCount,
      storeLifetimeSpend,
    };
  }, [users]);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Role filter
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;

        // Status filter
        if (statusFilter === 'active' && u.is_disabled) return false;
        if (statusFilter === 'disabled' && !u.is_disabled) return false;

        // Search query
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)) ||
          u.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'spend') {
          return (b.total_spent || 0) - (a.total_spent || 0);
        }
        if (sortBy === 'orders') {
          return (b.orders_count || 0) - (a.orders_count || 0);
        }
        if (sortBy === 'name') {
          return (a.full_name || '').localeCompare(b.full_name || '');
        }
        return 0;
      });
  }, [users, roleFilter, statusFilter, search, sortBy]);

  // Paginated Users
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortBy, pageSize]);

  // Export Users to CSV
  const exportUsersCSV = () => {
    if (filteredUsers.length === 0) return;

    const headers = [
      'User ID',
      'Full Name',
      'Email',
      'Phone',
      'Role',
      'Status',
      'Lifetime Spend (LKR)',
      'Total Orders',
      'Saved Addresses',
      'Registered Date',
    ];

    const rows = filteredUsers.map((u) => [
      `"${u.id}"`,
      `"${u.full_name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.role}"`,
      `"${u.is_disabled ? 'Disabled' : 'Active'}"`,
      `"${(u.total_spent || 0).toFixed(2)}"`,
      `"${u.orders_count || 0}"`,
      `"${u.addresses_count || 0}"`,
      `"${new Date(u.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wewala_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs: Customers vs Contact Inbox */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users size={16} />
            <span>Customers & Accounts</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'users'
                  ? 'bg-slate-800 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === 'inbox'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Inbox size={16} />
            <span>Contact Messages Inbox</span>
            {unreadInquiriesCount > 0 ? (
              <span className="rounded-full bg-blue-500 text-white px-2 py-0.5 text-[10px] font-bold animate-pulse">
                {unreadInquiriesCount} unread
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 text-[10px] font-bold">
                0
              </span>
            )}
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportUsersCSV}
              disabled={filteredUsers.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchUsersData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: CUSTOMERS & USER ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Users
                </span>
                <div className="rounded-xl bg-brand-50 dark:bg-brand-950/60 p-2 text-brand-600">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {kpis.totalUsers}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.customerCount} customers • {kpis.adminCount} administrators
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Accounts
                </span>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {kpis.activeCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.disabledCount > 0 ? (
                  <span className="text-rose-500 font-semibold">{kpis.disabledCount} disabled</span>
                ) : (
                  'All accounts in good standing'
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Storewide Spend
                </span>
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/60 p-2 text-purple-600">
                  <DollarSign size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {formatPrice(kpis.storeLifetimeSpend)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Cumulative revenue across customer profiles
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Administrators
                </span>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-600">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {kpis.adminCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Enforced by Supabase row-level security
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, email, phone, or UUID..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 pl-9 text-xs placeholder-slate-400 transition focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Shield size={14} className="text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customers Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <CheckCircle2 size={14} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Account Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <ArrowUpDown size={14} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="newest">Recently Registered</option>
                  <option value="oldest">Oldest Accounts</option>
                  <option value="spend">Highest Spend</option>
                  <option value="orders">Most Orders</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
                <p className="mt-2 text-xs text-slate-500">Loading user profiles & metrics...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500">
                <Users size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                No customer profiles match the current search or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Contact Phone</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                      <th className="py-3.5 px-4 text-center">Orders</th>
                      <th className="py-3.5 px-4">Registered</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedUsers.map((user) => {
                      const isSelf = user.id === currentAdminUser?.id;

                      return (
                        <tr
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsUserDrawerOpen(true);
                          }}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          {/* Customer Name, Avatar, Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name || 'Customer'}
                                    className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-300 text-xs">
                                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {user.full_name || 'Anonymous Customer'}
                                  </span>
                                  {isSelf && (
                                    <span className="rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 px-1.5 py-0.2 text-[9px] font-black">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {user.email || `ID: ${user.id.slice(0, 8)}...`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Contact Phone */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {user.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone size={11} className="text-slate-400" />
                                {user.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                user.role === 'admin'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {user.role === 'admin' && <Shield size={10} />}
                              <span>{user.role}</span>
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {user.is_disabled ? (
                              <span className="rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                                <Ban size={10} /> Disabled
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 size={10} /> Active
                              </span>
                            )}
                          </td>

                          {/* Lifetime Spend */}
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                            {formatPrice(user.total_spent || 0)}
                          </td>

                          {/* Total Orders */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {user.orders_count || 0}
                          </td>

                          {/* Registered Date */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsUserDrawerOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition"
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2 font-medium">
                  Showing {paginatedUsers.length} of {filteredUsers.length} users
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CONTACT MESSAGES INBOX */}
      {activeTab === 'inbox' && (
        <ContactMessagesInbox onUnreadCountChange={setUnreadInquiriesCount} />
      )}

      {/* Customer Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        currentAdminId={currentAdminUser?.id}
        onRoleChange={handleRoleChange}
        onToggleStatus={handleToggleStatus}
        onViewOrder={handleViewOrder}
      />

      {/* Order Detail Drawer (opened when clicking order in customer drawer) */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        onRequestStatusChange={() => {}}
        onPrintInvoice={(ord) => {
          setPrintOrder({ order: ord, type: 'invoice' });
          setTimeout(() => window.print(), 150);
        }}
        onPrintPackingSlip={(ord) => {
          setPrintOrder({ order: ord, type: 'packingslip' });
          setTimeout(() => window.print(), 150);
        }}
      />

      {/* Hidden Print Views */}
      {printOrder && printOrder.type === 'invoice' && (
        <OrderInvoicePrint orders={[printOrder.order]} />
      )}
      {printOrder && printOrder.type === 'packingslip' && (
        <OrderPackingSlipPrint orders={[printOrder.order]} />
      )}
    </div>
  );
}
