import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  CreditCard,
  Truck,
  Percent,
  DollarSign,
  RefreshCw,
  Loader2,
  Calendar,
  Download,
  Printer,
  ArrowUpRight,
  RotateCcw,
  ShoppingBag,
  Layers,
  Sparkles,
  Package,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, ORDER_STATUSES, OrderStatus } from '@wewala/shared';
import {
  SalesReportPrint,
  SalesReportPrintData,
} from '@/components/sales/SalesReportPrint';

type DatePreset =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'this_month'
  | 'last_month'
  | '90days'
  | 'all'
  | 'custom';

interface SalesMetrics {
  gross_revenue: number;
  net_revenue: number;
  orders_count: number;
  average_order_value: number;
  refunds_count: number;
  refunds_total: number;
  discounts_total: number;
  shipping_total: number;
}

interface TimelineItem {
  sale_date: string;
  revenue: number;
  order_count: number;
}

interface CategorySalesItem {
  category_id?: string;
  category_name: string;
  units_sold: number;
  total_revenue: number;
}

interface PaymentSalesItem {
  payment_method: string;
  order_count: number;
  total_revenue: number;
}

interface TopProductItem {
  product_id?: string;
  product_name: string;
  sku: string | null;
  category_name?: string;
  units_sold: number;
  total_revenue: number;
}

interface SalesOrderRecord {
  id: string;
  created_at: string;
  customer_name: string;
  phone?: string;
  payment_method: string;
  payment_status: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items_count: number;
}

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Metrics & Report data
  const [metrics, setMetrics] = useState<SalesMetrics>({
    gross_revenue: 0,
    net_revenue: 0,
    orders_count: 0,
    average_order_value: 0,
    refunds_count: 0,
    refunds_total: 0,
    discounts_total: 0,
    shipping_total: 0,
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesItem[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentSalesItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [orderRecords, setOrderRecords] = useState<SalesOrderRecord[]>([]);

  // Table filtering & pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState<'created_at' | 'total'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Compute ISO date boundaries from preset
  const { startIso, endIso, label: dateLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = 'Last 30 Days';

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        label = 'Today';
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        label = 'Yesterday';
        break;
      case '7days':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        label = 'Last 7 Days';
        break;
      case '30days':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        label = 'Last 30 Days';
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        label = 'This Month';
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        label = 'Last Month';
        break;
      case '90days':
        start.setDate(now.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        label = 'Last 90 Days';
        break;
      case 'all':
        start = new Date('2023-01-01T00:00:00Z');
        label = 'All Time';
        break;
      case 'custom':
        if (customStart) {
          start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
        } else {
          start.setDate(now.getDate() - 30);
        }
        if (customEnd) {
          end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
        }
        label = `Custom (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
        break;
    }

    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label,
    };
  }, [preset, customStart, customEnd]);

  // Master fetch function
  const fetchSalesReports = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch Summary Metrics RPC (with client fallback)
      let metricsData: SalesMetrics | null = null;
      try {
        const { data, error } = await supabase.rpc('get_sales_analytics', {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (!error && data) {
          metricsData = data as unknown as SalesMetrics;
        }
      } catch {
        // Fallback below
      }

      // 2. Fetch Timeline RPC (with client fallback)
      let timelineData: TimelineItem[] = [];
      try {
        const { data, error } = await supabase.rpc('get_sales_timeline', {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (!error && data && Array.isArray(data)) {
          timelineData = data;
        }
      } catch {
        // Fallback below
      }

      // 3. Fetch Category Breakdown RPC
      let categoryData: CategorySalesItem[] = [];
      try {
        const { data, error } = await supabase.rpc('get_sales_by_category_breakdown', {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (!error && data && Array.isArray(data)) {
          categoryData = data;
        }
      } catch {
        // Fallback below
      }

      // 4. Fetch Payment Method Breakdown RPC
      let paymentData: PaymentSalesItem[] = [];
      try {
        const { data, error } = await supabase.rpc('get_sales_by_payment_breakdown', {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (!error && data && Array.isArray(data)) {
          paymentData = data;
        }
      } catch {
        // Fallback below
      }

      // 5. Fetch Top Products RPC
      let topProdData: TopProductItem[] = [];
      try {
        const { data, error } = await supabase.rpc('get_sales_top_products_list', {
          p_start_date: startIso,
          p_end_date: endIso,
          p_limit: 5,
        });
        if (!error && data && Array.isArray(data)) {
          topProdData = data;
        }
      } catch {
        // Fallback below
      }

      // 6. Fetch Raw Orders with order_items in this date range
      const { data: rawOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false });

      const ordersList: SalesOrderRecord[] = (rawOrders || []).map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        customer_name: o.shipping_address?.recipient_name || 'Customer',
        phone: o.shipping_address?.phone,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        status: o.status,
        subtotal: Number(o.subtotal || 0),
        shipping: Number(o.shipping || 0),
        discount: Number(o.discount || 0),
        total: Number(o.total || 0),
        items_count: o.order_items?.length || 0,
      }));

      setOrderRecords(ordersList);

      // Perform client-side aggregations if RPCs weren't executed on database
      if (!metricsData) {
        const valid = ordersList.filter((o) => o.status !== 'cancelled');
        const gross = valid.reduce((sum, o) => sum + o.total, 0);
        const refundsList = ordersList.filter(
          (o) => o.status === 'refunded' || o.payment_status === 'refunded'
        );
        const refundTot = refundsList.reduce((sum, o) => sum + o.total, 0);
        const net = Math.max(0, gross - refundTot);
        const discTot = valid.reduce((sum, o) => sum + o.discount, 0);
        const shipTot = valid.reduce((sum, o) => sum + o.shipping, 0);
        const aov = valid.length > 0 ? Math.round(gross / valid.length) : 0;

        metricsData = {
          gross_revenue: gross,
          net_revenue: net,
          orders_count: valid.length,
          average_order_value: aov,
          refunds_count: refundsList.length,
          refunds_total: refundTot,
          discounts_total: discTot,
          shipping_total: shipTot,
        };
      }
      setMetrics(metricsData);

      if (timelineData.length === 0 && rawOrders) {
        // Group daily
        const map: Record<string, { revenue: number; order_count: number }> = {};
        rawOrders
          .filter((o) => o.status !== 'cancelled')
          .forEach((o) => {
            const dayKey = o.created_at.split('T')[0];
            if (!map[dayKey]) map[dayKey] = { revenue: 0, order_count: 0 };
            map[dayKey].revenue += Number(o.total || 0);
            map[dayKey].order_count += 1;
          });
        timelineData = Object.entries(map).map(([sale_date, v]) => ({
          sale_date,
          revenue: v.revenue,
          order_count: v.order_count,
        }));
      }
      setTimeline(timelineData);

      if (paymentData.length === 0 && rawOrders) {
        const map: Record<string, { count: number; rev: number }> = {};
        rawOrders
          .filter((o) => o.status !== 'cancelled')
          .forEach((o) => {
            if (!map[o.payment_method]) map[o.payment_method] = { count: 0, rev: 0 };
            map[o.payment_method].count += 1;
            map[o.payment_method].rev += Number(o.total || 0);
          });
        paymentData = Object.entries(map).map(([pm, v]) => ({
          payment_method: pm,
          order_count: v.count,
          total_revenue: v.rev,
        }));
      }
      setPaymentBreakdown(paymentData);

      if (categoryData.length === 0 && rawOrders) {
        // Fallback category aggregation
        const catMap: Record<string, { units: number; rev: number }> = {};
        rawOrders
          .filter((o) => o.status !== 'cancelled')
          .forEach((o) => {
            (o.order_items || []).forEach((it: any) => {
              const name = 'Store Items';
              if (!catMap[name]) catMap[name] = { units: 0, rev: 0 };
              catMap[name].units += it.quantity;
              catMap[name].rev += it.quantity * Number(it.price_snapshot);
            });
          });
        categoryData = Object.entries(catMap).map(([name, v]) => ({
          category_name: name,
          units_sold: v.units,
          total_revenue: v.rev,
        }));
      }
      setCategorySales(categoryData);

      if (topProdData.length === 0 && rawOrders) {
        const prodMap: Record<string, { name: string; sku: string | null; units: number; rev: number }> = {};
        rawOrders
          .filter((o) => o.status !== 'cancelled')
          .forEach((o) => {
            (o.order_items || []).forEach((it: any) => {
              const key = it.name_snapshot;
              if (!prodMap[key]) prodMap[key] = { name: it.name_snapshot, sku: null, units: 0, rev: 0 };
              prodMap[key].units += it.quantity;
              prodMap[key].rev += it.quantity * Number(it.price_snapshot);
            });
          });
        topProdData = Object.values(prodMap)
          .sort((a, b) => b.rev - a.rev)
          .slice(0, 5)
          .map((v) => ({
            product_name: v.name,
            sku: v.sku,
            units_sold: v.units,
            total_revenue: v.rev,
          }));
      }
      setTopProducts(topProdData);
    } catch (err) {
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    fetchSalesReports();
  }, [fetchSalesReports]);

  // Date Presets Config
  const presetsList: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: '7 Days' },
    { id: '30days', label: '30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: '90days', label: '90 Days' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ];

  // Filtered & Sorted Sales Orders Table
  const filteredOrders = useMemo(() => {
    return orderRecords.filter((o) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone?.includes(q)
      );
    });
  }, [orderRecords, search]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];
      if (sortCol === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (orderRecords.length === 0) {
      alert('No sales transaction data to export.');
      return;
    }

    const headers = [
      'Order Ref',
      'Date & Time',
      'Customer',
      'Phone',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Subtotal',
      'Discount',
      'Shipping Fee',
      'Total Amount',
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = orderRecords.map((o) => [
      escapeCSV(o.id),
      escapeCSV(new Date(o.created_at).toISOString()),
      escapeCSV(o.customer_name),
      escapeCSV(o.phone || ''),
      escapeCSV(o.payment_method),
      escapeCSV(o.payment_status),
      escapeCSV(o.status),
      escapeCSV(o.subtotal),
      escapeCSV(o.discount),
      escapeCSV(o.shipping),
      escapeCSV(o.total),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wewala-sales-report-${preset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF / Print Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Print Data Package
  const printableData: SalesReportPrintData = useMemo(() => {
    return {
      dateRangeLabel: dateLabel,
      startDateStr: new Date(startIso).toLocaleDateString(),
      endDateStr: new Date(endIso).toLocaleDateString(),
      generatedAt: new Date().toLocaleString(),
      metrics,
      categorySales,
      paymentBreakdown,
      topProducts,
      orders: orderRecords.map((o) => ({
        id: o.id,
        created_at: o.created_at,
        customer_name: o.customer_name,
        payment_method: o.payment_method,
        status: o.status,
        total: o.total,
        discount: o.discount,
      })),
    };
  }, [dateLabel, startIso, endIso, metrics, categorySales, paymentBreakdown, topProducts, orderRecords]);

  const maxTopProductRevenue = useMemo(
    () => Math.max(...topProducts.map((p) => p.total_revenue), 1),
    [topProducts]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden Print Document (Visible ONLY when printing / PDF export) */}
      <SalesReportPrint reportData={printableData} />

      {/* Screen View (Hidden when printing) */}
      <div className="print:hidden space-y-6">
        {/* Header & Date Range Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Sales & Revenue Analytics
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Audited Reports
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Financial performance, payment settlement breakdown, average order value, and refunds
            </p>
          </div>

          {/* Export & Refresh Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Print or Save as Executive PDF Report"
            >
              <Printer size={14} />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Download CSV spreadsheet"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchSalesReports}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Refresh Sales Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
            </button>
          </div>
        </div>

        {/* Date Range Preset Selector Bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {presetsList.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap ${
                  preset === p.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs (when custom is selected) */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium"
              />
            </div>
          )}
        </div>

        {/* KPI Financial Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Net Revenue */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Net Revenue
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {STORE_CONFIG.currencySymbol} {Number(metrics.net_revenue).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500">
              Gross: {STORE_CONFIG.currencySymbol} {Number(metrics.gross_revenue).toLocaleString()}
            </p>
          </div>

          {/* Total Orders */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Orders
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <ShoppingBag size={18} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {metrics.orders_count}
            </p>
            <p className="text-[11px] text-slate-500">
              Transactions processed during {dateLabel}
            </p>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Average Order Value
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {STORE_CONFIG.currencySymbol}{' '}
              {Number(metrics.average_order_value).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500">Average ticket per completed cart</p>
          </div>

          {/* Refunds Summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Refunds
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <RotateCcw size={18} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {STORE_CONFIG.currencySymbol} {Number(metrics.refunds_total).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500">
              Across {metrics.refunds_count} reversed order{metrics.refunds_count === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Charts Row: Revenue Over Time (8 cols) & Payment Gateway Split (4 cols) */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Revenue Over Time Chart */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Revenue Over Time
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Continuous daily sales figures and volume for {dateLabel}
              </p>
            </div>

            <div className="h-[280px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" /> Loading timeline...
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No sales recorded in this timeframe.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis
                      dataKey="sale_date"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const it = payload[0].payload as TimelineItem;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg text-xs">
                              <p className="font-semibold text-slate-500 mb-1">{it.sale_date}</p>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                {STORE_CONFIG.currencySymbol} {Number(it.revenue).toLocaleString()}
                              </p>
                              <p className="text-slate-500 mt-0.5">
                                {it.order_count} order{it.order_count === 1 ? '' : 's'}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment Method Split Donut */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-brand-500" />
                Sales by Payment Method
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Gateway settlement mix</p>
            </div>

            <div className="h-[200px] w-full relative flex items-center justify-center">
              {paymentBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400">No payment data in period</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      dataKey="total_revenue"
                      nameKey="payment_method"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {paymentBreakdown.map((entry, idx) => (
                        <Cell
                          key={entry.payment_method}
                          fill={entry.payment_method === 'card' ? '#0ea5e9' : '#f59e0b'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const it = payload[0].payload as PaymentSalesItem;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-lg text-xs">
                              <p className="font-bold uppercase text-slate-900 dark:text-white">
                                {it.payment_method === 'cod' ? 'Cash on Delivery' : 'Credit Card'}
                              </p>
                              <p className="text-emerald-500 font-bold mt-0.5">
                                {STORE_CONFIG.currencySymbol} {Number(it.total_revenue).toLocaleString()}
                              </p>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                {it.order_count} transactions
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Summary Pills */}
            <div className="mt-4 space-y-2 text-xs">
              {paymentBreakdown.map((p) => {
                const isCard = p.payment_method === 'card';
                return (
                  <div
                    key={p.payment_method}
                    className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isCard ? 'bg-sky-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-semibold uppercase text-slate-700 dark:text-slate-200">
                        {isCard ? 'Card (Stripe)' : 'Cash on Delivery'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {STORE_CONFIG.currencySymbol} {Number(p.total_revenue).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.order_count} orders
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Second Charts Row: Sales by Category (6 cols) & Top Products Leaderboard (6 cols) */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Sales by Category */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-brand-500" />
                Sales by Category
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revenue contribution by catalog department
              </p>
            </div>

            <div className="h-[240px] w-full">
              {categorySales.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No category sales recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySales} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis
                      dataKey="category_name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const it = payload[0].payload as CategorySalesItem;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-lg text-xs">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {it.category_name}
                              </p>
                              <p className="font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                                {STORE_CONFIG.currencySymbol} {Number(it.total_revenue).toLocaleString()}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                {it.units_sold} units sold
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total_revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Products Leaderboard */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Top Performing Products
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top sellers ranked by verified gross revenue
              </p>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No product revenue data recorded in this timeframe.
              </div>
            ) : (
              <div className="space-y-3.5 my-auto">
                {topProducts.map((p, idx) => {
                  const ratio = Math.round((p.total_revenue / maxTopProductRevenue) * 100);
                  return (
                    <div key={p.product_name + idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {p.product_name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {STORE_CONFIG.currencySymbol} {Number(p.total_revenue).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {p.units_sold} units
                          </span>
                        </div>
                      </div>
                      {/* Volume Bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Sales Transactions Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Sales Transaction Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized order records for {dateLabel}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order ref or customer..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 pl-8 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={24} />
              Loading transaction records...
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No sales transactions found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Order Ref</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => {
                        setSortCol('created_at');
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {sortCol === 'created_at' &&
                          (sortDir === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={() => {
                        setSortCol('total');
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total</span>
                        {sortCol === 'total' &&
                          (sortDir === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          ))}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOrders.map((o) => {
                    const statusConfig = ORDER_STATUSES[o.status] || {
                      label: o.status,
                      color: '#94a3b8',
                    };
                    const isRefunded = o.status === 'refunded' || o.payment_status === 'refunded';

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-400">
                            {new Date(o.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {o.customer_name}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold uppercase text-[10px] text-slate-700 dark:text-slate-300">
                            {o.payment_method}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                            style={{
                              backgroundColor: `${statusConfig.color}18`,
                              color: statusConfig.color,
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {o.items_count}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {STORE_CONFIG.currencySymbol} {o.subtotal.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {o.discount > 0 ? `-${STORE_CONFIG.currencySymbol} ${o.discount.toLocaleString()}` : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          <span className={isRefunded ? 'line-through text-slate-400 font-normal mr-1' : ''}>
                            {STORE_CONFIG.currencySymbol} {o.total.toLocaleString()}
                          </span>
                          {isRefunded && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                              Refunded
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && sortedOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 p-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, sortedOrders.length)} of{' '}
                  {sortedOrders.length} records
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Rows:</span>
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

              {/* Navigation */}
              <div className="flex items-center gap-1 self-center sm:self-auto">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
