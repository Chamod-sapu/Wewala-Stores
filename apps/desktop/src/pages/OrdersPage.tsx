import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileText,
  RotateCcw,
  Calendar,
  X,
  AlertTriangle,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, ORDER_STATUSES, OrderStatus, isOrderVisibleInAdmin } from '@wewala/shared';
import {
  OrderInvoicePrint,
  PrintOrderData,
} from '@/components/orders/OrderInvoicePrint';
import { OrderPackingSlipPrint } from '@/components/orders/OrderPackingSlipPrint';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { StatusChangeModal } from '@/components/orders/StatusChangeModal';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface OrderItem {
  id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  product_id?: string;
}

export interface OrderRecord {
  id: string;
  user_id?: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shipping_address: any;
  coupon_code?: string | null;
  created_at: string;
  updated_at?: string;
  order_items?: OrderItem[];
}

type SortColumn = 'created_at' | 'total' | 'id' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';
type DateRangeOption = 'all' | 'today' | '7days' | '30days' | 'custom';

export default function OrdersPage() {
  const { session } = useAdminAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection & Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer & Modal state
  const [drawerOrder, setDrawerOrder] = useState<PrintOrderData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Status Change Confirmation Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('processing');
  const [statusChangeOrder, setStatusChangeOrder] = useState<OrderRecord | null>(null);
  const [isBulkStatusChange, setIsBulkStatusChange] = useState(false);

  // Print Queue
  const [ordersToPrint, setOrdersToPrint] = useState<PrintOrderData[]>([]);
  const [printMode, setPrintMode] = useState<'invoice' | 'packingslip'>('invoice');

  // Fetch Orders from Supabase
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const allOrders = (data as unknown as OrderRecord[]) || [];
      const visibleOrders = allOrders.filter(isOrderVisibleInAdmin);
      setOrders(visibleOrders);
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time synchronization
  useEffect(() => {
    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    const channelName = `orders-page-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchOrders]);

  // Handle Sort Toggle
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filter Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // 2. Payment Method Filter
      if (paymentMethodFilter !== 'all' && order.payment_method !== paymentMethodFilter) {
        return false;
      }

      // 3. Payment Status Filter
      if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) {
        return false;
      }

      // 4. Date Range Filter
      const orderDate = new Date(order.created_at);
      const now = new Date();

      if (dateRange === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (orderDate < startOfToday) return false;
      } else if (dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (orderDate < sevenDaysAgo) return false;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        if (orderDate < thirtyDaysAgo) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }

      // 5. Search Text Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesName =
          order.shipping_address?.recipient_name?.toLowerCase().includes(q) || false;
        const matchesPhone = order.shipping_address?.phone?.includes(q) || false;
        const matchesCity =
          order.shipping_address?.city?.toLowerCase().includes(q) || false;

        if (!matchesId && !matchesName && !matchesPhone && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    statusFilter,
    paymentMethodFilter,
    paymentStatusFilter,
    dateRange,
    customStartDate,
    customEndDate,
    search,
  ]);

  // Sort Orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortColumn) {
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        case 'total':
          valA = Number(a.total || 0);
          valB = Number(b.total || 0);
          break;
        case 'id':
          valA = a.id;
          valB = b.id;
          break;
        case 'customer':
          valA = a.shipping_address?.recipient_name || '';
          valB = b.shipping_address?.recipient_name || '';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default:
          valA = a.created_at;
          valB = b.created_at;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortColumn, sortDirection]);

  // Paginated Orders
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentMethodFilter, paymentStatusFilter, dateRange, search]);

  // Selection logic
  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedIds.has(o.id));

  const isSomePageSelected =
    paginatedOrders.some((o) => selectedIds.has(o.id)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedOrders.forEach((o) => next.delete(o.id));
    } else {
      paginatedOrders.forEach((o) => next.add(o.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Perform Status Change via RPC (with stock restoration and audit logging)
  const executeStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
    reason?: string
  ) => {
    setIsUpdatingStatus(true);
    try {
      // 1. Try atomic admin_update_order_status RPC
      const { data, error } = await supabase.rpc('admin_update_order_status', {
        p_order_id: orderId,
        p_status: newStatus,
        p_reason: reason || null,
      });

      if (!error && data?.success) {
        // Success
      } else {
        // Fallback: direct update + restock if cancelling/refunding
        const targetOrder = orders.find((o) => o.id === orderId);
        if (targetOrder && ['cancelled', 'refunded'].includes(newStatus)) {
          // Restock items
          for (const it of targetOrder.order_items || []) {
            if (it.product_id) {
              const { data: prod } = await supabase
                .from('products')
                .select('stock')
                .eq('id', it.product_id)
                .single();
              if (prod) {
                await supabase
                  .from('products')
                  .update({ stock: prod.stock + it.quantity })
                  .eq('id', it.product_id);

                await supabase.from('inventory_movements').insert({
                  product_id: it.product_id,
                  change: it.quantity,
                  reason: `admin_${newStatus}${reason ? ': ' + reason : ''}`,
                  order_id: orderId,
                });
              }
            }
          }
        }

        await supabase
          .from('orders')
          .update({
            status: newStatus,
            payment_status:
              newStatus === 'paid'
                ? 'paid'
                : newStatus === 'refunded'
                ? 'refunded'
                : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (drawerOrder?.id === orderId) {
        setDrawerOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert(`Could not update order status: ${err.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Bulk Status Change
  const executeBulkStatusChange = async (
    newStatus: OrderStatus,
    reason?: string
  ) => {
    setIsUpdatingStatus(true);
    try {
      const ids = Array.from(selectedIds);
      // Attempt bulk RPC
      const { data, error } = await supabase.rpc('admin_bulk_update_orders', {
        p_order_ids: ids,
        p_status: newStatus,
        p_reason: reason || null,
      });

      if (error || !data?.success) {
        // Fallback: loop through executeStatusChange
        for (const id of ids) {
          await executeStatusChange(id, newStatus, reason);
        }
      } else {
        await fetchOrders();
      }

      clearSelection();
    } catch (err: any) {
      alert(`Bulk update error: ${err.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Status Confirmation Modal
  const promptStatusChange = (
    order: OrderRecord,
    newStatus: OrderStatus
  ) => {
    setStatusChangeOrder(order);
    setTargetStatus(newStatus);
    setIsBulkStatusChange(false);
    setStatusModalOpen(true);
  };

  const promptBulkStatusChange = (newStatus: OrderStatus) => {
    setIsBulkStatusChange(true);
    setTargetStatus(newStatus);
    setStatusModalOpen(true);
  };

  // CSV Export Utility
  const handleExportCSV = (ordersToExport: OrderRecord[]) => {
    if (ordersToExport.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Status',
      'Customer Name',
      'Phone',
      'Street Address',
      'City',
      'Postal Code',
      'Payment Method',
      'Payment Status',
      'Subtotal',
      'Shipping',
      'Discount',
      'Coupon Code',
      'Total',
      'Items Count',
      'Items Summary',
    ];

    const escapeCSV = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = ordersToExport.map((o) => {
      const itemsSummary = (o.order_items || [])
        .map((it) => `${it.name_snapshot} (x${it.quantity})`)
        .join('; ');

      return [
        escapeCSV(o.id),
        escapeCSV(new Date(o.created_at).toISOString()),
        escapeCSV(o.status),
        escapeCSV(o.shipping_address?.recipient_name || 'Customer'),
        escapeCSV(o.shipping_address?.phone || ''),
        escapeCSV(o.shipping_address?.street_address || ''),
        escapeCSV(o.shipping_address?.city || ''),
        escapeCSV(o.shipping_address?.postal_code || ''),
        escapeCSV(o.payment_method),
        escapeCSV(o.payment_status),
        escapeCSV(o.subtotal),
        escapeCSV(o.shipping),
        escapeCSV(o.discount),
        escapeCSV(o.coupon_code || ''),
        escapeCSV(o.total),
        escapeCSV(o.order_items?.length || 0),
        escapeCSV(itemsSummary),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `wewala-orders-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handlers
  const handlePrintSingle = (
    order: PrintOrderData,
    mode: 'invoice' | 'packingslip'
  ) => {
    setOrdersToPrint([order]);
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintBulk = (mode: 'invoice' | 'packingslip') => {
    const selectedOrdersList = orders.filter((o) => selectedIds.has(o.id));
    if (selectedOrdersList.length === 0) return;
    setOrdersToPrint(selectedOrdersList as unknown as PrintOrderData[]);
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setPaymentStatusFilter('all');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Printable Views (Invisible on screen, visible only when printing) */}
      {printMode === 'invoice' ? (
        <OrderInvoicePrint orders={ordersToPrint} />
      ) : (
        <OrderPackingSlipPrint orders={ordersToPrint} />
      )}

      {/* Main Screen Content (Hidden when printing) */}
      <div className="print:hidden space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Orders Management
              </h1>
              <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                {orders.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Filter transactions, dispatch fulfillment lifecycle, print invoices, and audit restocks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleExportCSV(filteredOrders)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Export all currently filtered orders to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Status Navigation Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending' },
            { id: 'paid', label: 'Paid' },
            { id: 'processing', label: 'Processing' },
            { id: 'shipped', label: 'Shipped' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'refunded', label: 'Refunded' },
          ].map((tab) => {
            const count = statusCounts[tab.id] || 0;
            const isAct = statusFilter === tab.id;
            const conf = ORDER_STATUSES[tab.id as OrderStatus];
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
                  isAct
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {conf && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: conf.color }}
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isAct
                      ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters and Search Toolbar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ref, customer name, phone, or city..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 pl-9 pr-8 text-xs placeholder-slate-400 transition focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Payment Method */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
                <CreditCard size={13} className="text-slate-400" />
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="card">Card (Stripe / PayHere)</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
                <span className="text-slate-400 font-bold">Pay:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Pay Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Date Range Pre-sets */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
                <Calendar size={13} className="text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                  className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Reset button if active filters */}
              {(statusFilter !== 'all' ||
                paymentMethodFilter !== 'all' ||
                paymentStatusFilter !== 'all' ||
                dateRange !== 'all' ||
                search) && (
                <button
                  onClick={handleResetFilters}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Custom Date Range Picker Row (if custom is selected) */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-500">Custom Range:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Selection & Bulk Actions Banner (appears when >= 1 order selected) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white dark:bg-brand-950 dark:border dark:border-brand-800/60 p-4 shadow-lg animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 font-bold text-xs text-white">
                {selectedIds.size}
              </span>
              <span className="text-xs font-bold">
                {selectedIds.size} {selectedIds.size === 1 ? 'order' : 'orders'} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Transition Actions */}
              <div className="flex items-center gap-1 bg-slate-800 dark:bg-slate-900 rounded-xl p-1 text-xs">
                <span className="px-2 text-slate-400 text-[11px] font-semibold">
                  Set Status:
                </span>
                <button
                  onClick={() => promptBulkStatusChange('paid')}
                  className="rounded-lg px-2.5 py-1 font-bold text-blue-400 hover:bg-slate-700 transition"
                >
                  Paid
                </button>
                <button
                  onClick={() => promptBulkStatusChange('processing')}
                  className="rounded-lg px-2.5 py-1 font-bold text-indigo-400 hover:bg-slate-700 transition"
                >
                  Processing
                </button>
                <button
                  onClick={() => promptBulkStatusChange('shipped')}
                  className="rounded-lg px-2.5 py-1 font-bold text-purple-400 hover:bg-slate-700 transition"
                >
                  Shipped
                </button>
                <button
                  onClick={() => promptBulkStatusChange('delivered')}
                  className="rounded-lg px-2.5 py-1 font-bold text-emerald-400 hover:bg-slate-700 transition"
                >
                  Delivered
                </button>
                <button
                  onClick={() => promptBulkStatusChange('cancelled')}
                  className="rounded-lg px-2.5 py-1 font-bold text-rose-400 hover:bg-slate-700 transition"
                >
                  Cancel (Restock)
                </button>
              </div>

              {/* Bulk Print */}
              <button
                onClick={() => handlePrintBulk('invoice')}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
              >
                <Printer size={13} /> Invoices
              </button>
              <button
                onClick={() => handlePrintBulk('packingslip')}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
              >
                <FileText size={13} /> Packing Slips
              </button>

              {/* Bulk Export */}
              <button
                onClick={() =>
                  handleExportCSV(orders.filter((o) => selectedIds.has(o.id)))
                }
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
              >
                <Download size={13} /> Export CSV
              </button>

              <button
                onClick={clearSelection}
                className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Orders Data Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
              <p className="mt-3 text-xs text-slate-500 font-semibold">
                Synchronizing store orders...
              </p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <ShoppingBag size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                No orders match your criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search terms, status filters, or date range options.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 px-3 py-1.5 text-xs font-bold hover:bg-brand-100 transition"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                    {/* Checkbox Col */}
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomePageSelected;
                        }}
                        onChange={toggleSelectAllPage}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                      />
                    </th>

                    {/* Order ID */}
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Order Ref</span>
                        {sortColumn === 'id' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>

                    {/* Date */}
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date & Time</span>
                        {sortColumn === 'created_at' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>

                    {/* Customer */}
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer</span>
                        {sortColumn === 'customer' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>

                    {/* Payment */}
                    <th className="py-3 px-4">Payment</th>

                    {/* Items */}
                    <th className="py-3 px-4 text-center">Items</th>

                    {/* Total Amount */}
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total</span>
                        {sortColumn === 'total' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>

                    {/* Status */}
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Status & Action</span>
                        {sortColumn === 'status' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>

                    {/* Actions */}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOrders.map((order) => {
                    const isSelected = selectedIds.has(order.id);
                    const statusConfig = ORDER_STATUSES[order.status] || {
                      label: order.status,
                      color: '#94a3b8',
                    };

                    return (
                      <tr
                        key={order.id}
                        className={`transition ${
                          isSelected
                            ? 'bg-brand-50/40 dark:bg-brand-950/20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(order.id)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                          />
                        </td>

                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          <button
                            onClick={() => {
                              setDrawerOrder(order as unknown as PrintOrderData);
                              setIsDrawerOpen(true);
                            }}
                            className="hover:underline font-mono"
                          >
                            #{order.id.slice(0, 8).toUpperCase()}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {order.shipping_address?.recipient_name || 'Customer'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {order.shipping_address?.city || 'No City'}
                            {order.shipping_address?.phone
                              ? ` • ${order.shipping_address.phone}`
                              : ''}
                          </p>
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold uppercase text-[10px] text-slate-700 dark:text-slate-300 block">
                            {order.payment_method === 'cod' ? 'Cash On Delivery' : 'Prepaid Card'}
                          </span>
                          <span
                            className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] font-bold capitalize mt-0.5 ${
                              order.payment_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : order.payment_status === 'refunded'
                                ? 'bg-slate-500/10 text-slate-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {order.payment_status}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-slate-700 dark:text-slate-300">
                            {order.order_items?.length || 0}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                          {STORE_CONFIG.currencySymbol}{' '}
                          {Number(order.total).toLocaleString()}
                        </td>

                        {/* Status with Quick Select */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                              style={{
                                backgroundColor: `${statusConfig.color}18`,
                                color: statusConfig.color,
                              }}
                            >
                              {statusConfig.label}
                            </span>

                            {/* Dropdown to prompt status change */}
                            <select
                              value={order.status}
                              onChange={(e) =>
                                promptStatusChange(
                                  order,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancel (Restock)</option>
                              <option value="refunded">Refund (Restock)</option>
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setDrawerOrder(order as unknown as PrintOrderData);
                                setIsDrawerOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                              title="View Order Details Drawer"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() =>
                                handlePrintSingle(
                                  order as unknown as PrintOrderData,
                                  'invoice'
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                              title="Print Invoice"
                            >
                              <Printer size={15} />
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

          {/* Pagination Controls Footer */}
          {!loading && sortedOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 p-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Showing{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.min(currentPage * pageSize, sortedOrders.length)}
                  </strong>{' '}
                  of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {sortedOrders.length}
                  </strong>{' '}
                  orders
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-0.5 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1 self-center sm:self-auto">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  title="First Page"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
                >
                  Next <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={drawerOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRequestStatusChange={(newStatus) => {
          if (drawerOrder) {
            const rawOrder = orders.find((o) => o.id === drawerOrder.id);
            if (rawOrder) {
              promptStatusChange(rawOrder, newStatus);
            }
          }
        }}
        onPrintInvoice={(ord) => handlePrintSingle(ord, 'invoice')}
        onPrintPackingSlip={(ord) => handlePrintSingle(ord, 'packingslip')}
        isUpdating={isUpdatingStatus}
      />

      {/* Status Change Confirmation Modal (handles both single & bulk with restock explanation) */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={async (reason) => {
          if (isBulkStatusChange) {
            await executeBulkStatusChange(targetStatus, reason);
          } else if (statusChangeOrder) {
            await executeStatusChange(
              statusChangeOrder.id,
              targetStatus,
              reason
            );
          }
        }}
        targetStatus={targetStatus}
        currentStatus={
          isBulkStatusChange
            ? 'pending'
            : statusChangeOrder?.status || 'pending'
        }
        orderRef={
          isBulkStatusChange
            ? `${selectedIds.size} Selected Orders`
            : statusChangeOrder?.id.slice(0, 8).toUpperCase()
        }
        itemCount={
          isBulkStatusChange
            ? selectedIds.size
            : statusChangeOrder?.order_items?.length || 1
        }
      />
    </div>
  );
}
