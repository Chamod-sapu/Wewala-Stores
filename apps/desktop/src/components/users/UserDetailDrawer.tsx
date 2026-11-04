import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, Address, Order, OrderStatus, isOrderVisibleInAdmin } from '@wewala/shared';
import type { UserWithStats } from '@wewala/shared';

const formatPrice = (val: number) =>
  `${STORE_CONFIG.currencySymbol} ${Number(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface UserDetailDrawerProps {
  user: UserWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  currentAdminId?: string;
  onRoleChange: (userId: string, newRole: 'admin' | 'customer') => Promise<void>;
  onToggleStatus: (userId: string, isDisabled: boolean) => Promise<void>;
  onViewOrder?: (orderId: string) => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user,
  isOpen,
  onClose,
  currentAdminId,
  onRoleChange,
  onToggleStatus,
  onViewOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'addresses' | 'orders'>('overview');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Copy UUID state
  const [copiedId, setCopiedId] = useState(false);

  // Confirmations modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'promote' | 'demote' | 'disable' | 'enable';
    isOpen: boolean;
  }>({
    type: 'promote',
    isOpen: false,
  });

  const isSelf = user?.id === currentAdminId;

  // Fetch addresses and orders when opened
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchUserData = async () => {
      setLoadingData(true);
      try {
        const [addrRes, orderRes] = await Promise.all([
          supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false }),
          supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (addrRes.data) setAddresses(addrRes.data as Address[]);
        if (orderRes.data) {
          const visibleOrders = (orderRes.data as Order[]).filter(isOrderVisibleInAdmin);
          setOrders(visibleOrders);
        }
      } catch (err) {
        console.warn('Error fetching user detail data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserData();
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  // Computed metrics
  const completedOrders = orders.filter((o) =>
    ['delivered', 'paid', 'completed'].includes(o.status)
  );
  const nonCancelledOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalSpend = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const aov = nonCancelledOrders.length > 0 ? totalSpend / nonCancelledOrders.length : 0;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExecuteAction = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'promote') {
        await onRoleChange(user.id, 'admin');
      } else if (confirmModal.type === 'demote') {
        await onRoleChange(user.id, 'customer');
      } else if (confirmModal.type === 'disable') {
        await onToggleStatus(user.id, true);
      } else if (confirmModal.type === 'enable') {
        await onToggleStatus(user.id, false);
      }
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(`Action failed: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'Customer'}
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-brand-500/20"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-xl text-slate-700 dark:text-slate-300">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {user.role === 'admin' && (
                    <div
                      className="absolute -bottom-1 -right-1 rounded-lg bg-amber-500 p-1 text-white shadow"
                      title="Store Administrator"
                    >
                      <Shield size={12} className="stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {user.full_name || 'Anonymous Customer'}
                    </h2>

                    {/* Role badge */}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {user.role}
                    </span>

                    {/* Status badge */}
                    {user.is_disabled ? (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <Ban size={10} /> Disabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    )}

                    {isSelf && (
                      <span className="rounded-full bg-brand-100 dark:bg-brand-950/60 border border-brand-300 dark:border-brand-800 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                        You
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail size={12} />
                    <span>{user.email || 'No email attached'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-4 gap-2.5 mt-5">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lifetime Spend
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {formatPrice(totalSpend)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Orders
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Avg. Order Value
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {formatPrice(aov)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Addresses
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {addresses.length}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {/* Promote / Demote Button */}
                {user.role === 'customer' ? (
                  <button
                    onClick={() => setConfirmModal({ type: 'promote', isOpen: true })}
                    disabled={isSelf || actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    <ShieldCheck size={14} />
                    <span>Promote to Admin</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmModal({ type: 'demote', isOpen: true })}
                    disabled={isSelf || actionLoading}
                    title={isSelf ? 'You cannot demote your own account' : ''}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    <User size={14} />
                    <span>Demote to Customer</span>
                  </button>
                )}

                {/* Enable / Disable Button */}
                {user.is_disabled ? (
                  <button
                    onClick={() => setConfirmModal({ type: 'enable', isOpen: true })}
                    disabled={isSelf || actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>Enable Account</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmModal({ type: 'disable', isOpen: true })}
                    disabled={isSelf || actionLoading}
                    title={isSelf ? 'You cannot disable your own account' : ''}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    <Ban size={14} />
                    <span>Disable Account</span>
                  </button>
                )}
              </div>

              {isSelf && (
                <span className="text-[11px] text-slate-400 italic">
                  Self-modification disabled
                </span>
              )}
            </div>

            {/* Navigation Sub-tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mt-4 -mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'overview'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={14} />
                <span>Profile Info</span>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'addresses'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MapPin size={14} />
                <span>Saved Addresses ({addresses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'orders'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingBag size={14} />
                <span>Order History ({orders.length})</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingData ? (
              <div className="py-16 text-center">
                <Loader2 size={28} className="animate-spin text-brand-500 mx-auto" />
                <p className="mt-2 text-xs text-slate-500">Loading customer information...</p>
              </div>
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* User ID card */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Customer Identifier (UUID)
                          </span>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-0.5 select-all">
                            {user.id}
                          </p>
                        </div>
                        <button
                          onClick={handleCopyId}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                        >
                          {copiedId ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-emerald-600 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Contact Information
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium">Email Address</span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            {user.email ? (
                              <a
                                href={`mailto:${user.email}`}
                                className="text-brand-600 dark:text-brand-400 hover:underline"
                              >
                                {user.email}
                              </a>
                            ) : (
                              <span className="italic text-slate-400">None provided</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-medium">Phone Number</span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            {user.phone ? (
                              <a
                                href={`tel:${user.phone}`}
                                className="text-brand-600 dark:text-brand-400 hover:underline"
                              >
                                {user.phone}
                              </a>
                            ) : (
                              <span className="italic text-slate-400">Not provided</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-medium">Account Registered</span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            {new Date(user.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-medium">Last Profile Update</span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order summary stats breakdown */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Order Status Breakdown
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                            Delivered / Completed
                          </span>
                          <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                            {completedOrders.length}
                          </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3">
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                            Pending / Active
                          </span>
                          <p className="text-lg font-black text-amber-800 dark:text-amber-300 mt-0.5">
                            {orders.filter((o) => ['pending', 'processing', 'shipped'].includes(o.status)).length}
                          </p>
                        </div>

                        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3">
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                            Cancelled / Refunded
                          </span>
                          <p className="text-lg font-black text-rose-800 dark:text-rose-300 mt-0.5">
                            {orders.filter((o) => o.status === 'cancelled').length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ADDRESSES TAB */}
                {activeTab === 'addresses' && (
                  <div className="space-y-4">
                    {addresses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                        <MapPin size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                        <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                          No Saved Addresses
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          This customer has not saved any shipping or billing addresses in their profile yet.
                        </p>
                      </div>
                    ) : (
                      addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm relative"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {addr.recipient_name}
                              </h4>
                              {addr.is_default && (
                                <span className="rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2 py-0.5 text-[10px] font-bold">
                                  Default Shipping Address
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone size={12} /> {addr.phone}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                            <p>{addr.street_address}</p>
                            <p>
                              {addr.city}
                              {addr.state ? `, ${addr.state}` : ''} {addr.postal_code}
                            </p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {addr.country}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. ORDERS TAB */}
                {activeTab === 'orders' && (
                  <div className="space-y-3">
                    {orders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                        <ShoppingBag size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                        <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                          No Orders Placed Yet
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          This customer has not placed any orders yet.
                        </p>
                      </div>
                    ) : (
                      orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-brand-300 dark:hover:border-brand-800 transition shadow-sm flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                #{ord.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  ord.status === 'delivered' || ord.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : ord.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : ord.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {ord.status}
                              </span>
                              <span className="rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                {ord.payment_method}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1">
                              Placed on {new Date(ord.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {formatPrice(ord.total)}
                              </span>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {ord.payment_status}
                              </p>
                            </div>

                            {onViewOrder && (
                              <button
                                onClick={() => onViewOrder(ord.id)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 transition"
                                title="Inspect order details"
                              >
                                <ChevronRight size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {confirmModal.type === 'promote' && (
                <div className="rounded-xl bg-amber-100 dark:bg-amber-950 p-2.5 text-amber-600 dark:text-amber-400">
                  <ShieldAlert size={24} />
                </div>
              )}
              {confirmModal.type === 'demote' && (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-400">
                  <AlertTriangle size={24} />
                </div>
              )}
              {confirmModal.type === 'disable' && (
                <div className="rounded-xl bg-rose-100 dark:bg-rose-950 p-2.5 text-rose-600 dark:text-rose-400">
                  <Ban size={24} />
                </div>
              )}
              {confirmModal.type === 'enable' && (
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950 p-2.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
              )}

              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModal.type === 'promote' && 'Promote User to Administrator?'}
                  {confirmModal.type === 'demote' && 'Demote User to Regular Customer?'}
                  {confirmModal.type === 'disable' && 'Disable User Account?'}
                  {confirmModal.type === 'enable' && 'Re-enable User Account?'}
                </h4>
                <p className="text-xs text-slate-500">
                  Target user: <strong>{user.full_name || user.email || user.id.slice(0, 8)}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
              {confirmModal.type === 'promote' &&
                'Granting the Admin role provides this account full access to the admin console, including order handling, inventory management, customer data, and sales reports.'}
              {confirmModal.type === 'demote' &&
                'Demoting will immediately revoke access to the desktop admin console. This user will only retain regular customer storefront privileges.'}
              {confirmModal.type === 'disable' &&
                'Disabling this account flags the user profile as inactive and disables their ability to place orders.'}
              {confirmModal.type === 'enable' &&
                'Re-enabling will restore full active permissions to this account.'}
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                  confirmModal.type === 'promote'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmModal.type === 'demote'
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : confirmModal.type === 'disable'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                <span>
                  {confirmModal.type === 'promote' && 'Confirm Promotion'}
                  {confirmModal.type === 'demote' && 'Confirm Demotion'}
                  {confirmModal.type === 'disable' && 'Confirm Disable'}
                  {confirmModal.type === 'enable' && 'Confirm Enable'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

