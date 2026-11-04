import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  Plus,
  DollarSign,
  ChevronRight,
  Sparkles,
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
} from 'recharts';
import { supabase } from '@/lib/supabase';
import {
  STORE_CONFIG,
  ORDER_STATUSES,
  OrderStatus,
  Product,
  isOrderVisibleInAdmin,
} from '@wewala/shared';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface DashboardKPIs {
  today_revenue: number;
  today_orders: number;
  new_customers_today: number;
  pending_orders: number;
  low_stock_count: number;
}

interface RevenueChartItem {
  sale_date: string;
  revenue: number;
  order_count: number;
}

interface OrderStatusItem {
  status: string;
  order_count: number;
  total_amount: number;
}

interface TopSellingItem {
  product_id: string;
  product_name: string;
  units_sold: number;
  total_revenue: number;
}

interface RecentOrder {
  id: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  shipping_address: {
    recipient_name?: string;
    city?: string;
  } | null;
}

export default function DashboardPage() {
  const { session } = useAdminAuth();
  const { notifications } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  // KPIs
  const [kpis, setKpis] = useState<DashboardKPIs>({
    today_revenue: 0,
    today_orders: 0,
    new_customers_today: 0,
    pending_orders: 0,
    low_stock_count: 0,
  });

  // Chart range: 7 | 30 | 90 days
  const [daysRange, setDaysRange] = useState<7 | 30 | 90>(30);
  const [revenueData, setRevenueData] = useState<RevenueChartItem[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Status breakdown
  const [statusData, setStatusData] = useState<OrderStatusItem[]>([]);

  // Top selling products
  const [topProducts, setTopProducts] = useState<TopSellingItem[]>([]);

  // Recent Orders & Low stock items
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // 1. Fetch KPIs
  const fetchKPIs = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const isoToday = todayStart.toISOString();

      // Orders today (filter to visible admin orders only: COD or completed Card payments)
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total, status, payment_method, payment_status')
        .gte('created_at', isoToday);

      const visibleTodayOrders = (todayOrders || []).filter(isOrderVisibleInAdmin);

      const todayRev = visibleTodayOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Pending orders awaiting fulfillment (COD pending or paid card pending fulfillment)
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('payment_method, payment_status')
        .eq('status', 'pending');

      const pendingCount = (pendingOrders || []).filter(isOrderVisibleInAdmin).length;

      // New customers today
      const { count: newCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', isoToday)
        .eq('role', 'customer');

      // Low stock count
      const { data: prods } = await supabase
        .from('products')
        .select('stock, low_stock_threshold')
        .eq('is_active', true);

      const lowCount = (prods || []).filter((p) => p.stock <= p.low_stock_threshold).length;

      setKpis({
        today_revenue: todayRev,
        today_orders: visibleTodayOrders.length,
        new_customers_today: newCustomers || 0,
        pending_orders: pendingCount,
        low_stock_count: lowCount,
      });
    } catch (err) {
      console.warn('Dashboard KPI fetch error:', err);
    }
  }, []);

  // 2. Fetch Revenue Timeline Chart
  const fetchRevenueChart = useCallback(async (days: number) => {
    setChartLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total, status, payment_method, payment_status')
        .gte('created_at', cutoff.toISOString())
        .neq('status', 'cancelled');

      const visibleOrders = (orders || []).filter(isOrderVisibleInAdmin);

      const map: Record<string, { revenue: number; order_count: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split('T')[0];
        map[key] = { revenue: 0, order_count: 0 };
      }

      visibleOrders.forEach((o) => {
        const key = o.created_at.split('T')[0];
        if (map[key]) {
          map[key].revenue += Number(o.total || 0);
          map[key].order_count += 1;
        }
      });

      const chartList = Object.entries(map).map(([sale_date, val]) => ({
        sale_date,
        revenue: val.revenue,
        order_count: val.order_count,
      }));

      setRevenueData(chartList);
    } catch (err) {
      console.warn('Dashboard chart fetch error:', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // 3. Fetch Orders by Status
  const fetchStatusBreakdown = useCallback(async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total, payment_method, payment_status');

      if (orders) {
        const visibleOrders = orders.filter(isOrderVisibleInAdmin);
        const map: Record<string, { count: number; total: number }> = {};
        visibleOrders.forEach((o) => {
          if (!map[o.status]) map[o.status] = { count: 0, total: 0 };
          map[o.status].count += 1;
          map[o.status].total += Number(o.total || 0);
        });
        const list = Object.entries(map).map(([status, val]) => ({
          status,
          order_count: val.count,
          total_amount: val.total,
        }));
        setStatusData(list);
      }
    } catch (err) {
      console.warn('Status breakdown fetch error:', err);
    }
  }, []);

  // 4. Fetch Top Selling Products
  const fetchTopSelling = useCallback(async () => {
    try {
      const { data: ordersWithItems } = await supabase
        .from('orders')
        .select(
          'payment_method, payment_status, status, order_items(product_id, name_snapshot, quantity, price_snapshot)'
        )
        .neq('status', 'cancelled');

      if (ordersWithItems) {
        const visibleOrders = ordersWithItems.filter(isOrderVisibleInAdmin);
        const map: Record<string, { name: string; units: number; revenue: number }> = {};
        visibleOrders.forEach((o: any) => {
          (o.order_items || []).forEach((it: any) => {
            const pid = it.product_id || it.name_snapshot;
            if (!map[pid]) {
              map[pid] = { name: it.name_snapshot, units: 0, revenue: 0 };
            }
            map[pid].units += it.quantity;
            map[pid].revenue += it.quantity * Number(it.price_snapshot);
          });
        });

        const list = Object.entries(map)
          .map(([id, val]) => ({
            product_id: id,
            product_name: val.name,
            units_sold: val.units,
            total_revenue: val.revenue,
          }))
          .sort((a, b) => b.units_sold - a.units_sold)
          .slice(0, 5);

        setTopProducts(list);
      }
    } catch (err) {
      console.warn('Top products fetch error:', err);
    }
  }, []);

  // 5. Fetch Recent Orders & Low Stock
  const fetchRecentAndLowStock = useCallback(async () => {
    try {
      // Recent orders: fetch 25 to allow filtering out pending card orders and keeping top 6
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (orders) {
        const visibleOrders = (orders as unknown as RecentOrder[])
          .filter(isOrderVisibleInAdmin)
          .slice(0, 6);
        setRecentOrders(visibleOrders);
      }

      // Low stock products
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .order('stock', { ascending: true });

      if (prods) {
        const low = prods.filter((p) => p.stock <= p.low_stock_threshold);
        setLowStockProducts(low);
      }
    } catch (err) {
      console.warn('Recent/Low-stock fetch error:', err);
    }
  }, []);

  // Master load
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchKPIs(),
      fetchRevenueChart(daysRange),
      fetchStatusBreakdown(),
      fetchTopSelling(),
      fetchRecentAndLowStock(),
    ]);
    setLoading(false);
  }, [
    daysRange,
    fetchKPIs,
    fetchRevenueChart,
    fetchStatusBreakdown,
    fetchTopSelling,
    fetchRecentAndLowStock,
  ]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Days Toggle
  const handleRangeChange = (days: 7 | 30 | 90) => {
    setDaysRange(days);
    fetchRevenueChart(days);
  };

  // Quick Restock Action
  const handleQuickRestock = async (product: Product, amount: number = 10) => {
    setRestockingId(product.id);
    try {
      const newStock = product.stock + amount;

      // Update product stock
      const { error: prodError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id);

      if (prodError) throw prodError;

      // Log inventory movement
      await supabase.from('inventory_movements').insert({
        product_id: product.id,
        change: amount,
        reason: 'Restock via Dashboard Quick Alert',
      });

      // Refresh data
      await Promise.all([fetchKPIs(), fetchRecentAndLowStock()]);
    } catch (err) {
      console.error('Quick restock error:', err);
    } finally {
      setRestockingId(null);
    }
  };

  // Realtime subscription on orders & products to keep dashboard live
  useEffect(() => {
    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    const channelName = `dashboard-realtime-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchKPIs();
          fetchRevenueChart(daysRange);
          fetchStatusBreakdown();
          fetchTopSelling();
          fetchRecentAndLowStock();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchKPIs();
          fetchRecentAndLowStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, daysRange, fetchKPIs, fetchRevenueChart, fetchStatusBreakdown, fetchTopSelling, fetchRecentAndLowStock]);

  // Pie chart calculation
  const totalStatusOrders = useMemo(
    () => statusData.reduce((sum, item) => sum + item.order_count, 0),
    [statusData]
  );

  const maxTopSellingUnits = useMemo(
    () => Math.max(...topProducts.map((p) => p.units_sold), 1),
    [topProducts]
  );

  // Formatter helpers
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${monthNames[m]} ${d}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time financial performance, fulfillment queues, and inventory alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Today's Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Today's Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {STORE_CONFIG.currencySymbol} {kpis.today_revenue.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Total non-cancelled sales
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition duration-300" />
        </div>

        {/* Orders Today */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Orders Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {kpis.today_orders}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Incoming customer purchases
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500 transform scale-x-0 group-hover:scale-x-100 transition duration-300" />
        </div>

        {/* Pending Orders */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Orders
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {kpis.pending_orders}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Awaiting order confirmation
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition duration-300" />
        </div>

        {/* New Customers */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              New Customers
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {kpis.new_customers_today}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Profiles registered today
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-500 transform scale-x-0 group-hover:scale-x-100 transition duration-300" />
        </div>

        {/* Low-Stock Count */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Low-Stock SKUs
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                kpis.low_stock_count > 0
                  ? 'bg-rose-500/10 text-rose-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <p
            className={`mt-3 text-2xl font-black tracking-tight ${
              kpis.low_stock_count > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
            }`}
          >
            {kpis.low_stock_count}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Items under safety limit
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-rose-500 transform scale-x-0 group-hover:scale-x-100 transition duration-300" />
        </div>
      </div>

      {/* Main Charts Row: Revenue Area Chart (8 cols) & Orders by Status (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* Revenue Line / Area Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Revenue Trajectory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily sales volume and transaction count across the selected window
              </p>
            </div>

            {/* 7 / 30 / 90 Days Range Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => handleRangeChange(days)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    daysRange === days
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-[280px] w-full">
            {chartLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                <RefreshCw size={18} className="animate-spin mr-2" /> Loading chart data...
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No revenue recorded in this time range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis
                    dataKey="sale_date"
                    tickFormatter={formatShortDate}
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
                        const dataItem = payload[0].payload as RevenueChartItem;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg text-xs">
                            <p className="font-semibold text-slate-500 mb-1">{dataItem.sale_date}</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {STORE_CONFIG.currencySymbol} {Number(dataItem.revenue).toLocaleString()}
                            </p>
                            <p className="text-slate-500 mt-1">
                              {dataItem.order_count} {dataItem.order_count === 1 ? 'order' : 'orders'}
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
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Orders by Status Donut Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-500" />
              Orders by Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current lifecycle distribution across all {totalStatusOrders} orders
            </p>
          </div>

          <div className="h-[200px] w-full relative flex items-center justify-center">
            {statusData.length === 0 ? (
              <p className="text-xs text-slate-400">No order data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="order_count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => {
                      const st = ORDER_STATUSES[entry.status as OrderStatus];
                      const color = st?.color || '#94a3b8';
                      return <Cell key={entry.status} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as OrderStatusItem;
                        const pct = totalStatusOrders > 0
                          ? ((item.order_count / totalStatusOrders) * 100).toFixed(1)
                          : '0';
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-lg text-xs">
                            <p className="font-bold capitalize text-slate-800 dark:text-slate-100">
                              {item.status}
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              {item.order_count} orders ({pct}%)
                            </p>
                            <p className="text-emerald-500 font-semibold mt-0.5">
                              {STORE_CONFIG.currencySymbol} {Number(item.total_amount).toLocaleString()}
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

            {/* Inner Center Badge */}
            {statusData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {totalStatusOrders}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total
                </span>
              </div>
            )}
          </div>

          {/* Status Breakdown Legend pills */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {statusData.map((item) => {
              const st = ORDER_STATUSES[item.status as OrderStatus] || { label: item.status, color: '#94a3b8' };
              return (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    />
                    <span className="truncate capitalize text-slate-600 dark:text-slate-300 font-medium">
                      {st.label}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {item.order_count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Row: Top Selling Products (5 cols) & Recent Orders (7 cols) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Top-Selling Products */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Top-Selling Products
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">By verified fulfilled volume</p>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Inventory <ChevronRight size={13} />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No sales data recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, idx) => {
                const ratio = Math.round((p.units_sold / maxTopSellingUnits) * 100);
                return (
                  <div key={p.product_id || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                            idx === 0
                              ? 'bg-amber-500 text-white'
                              : idx === 1
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                              : idx === 2
                              ? 'bg-amber-700/60 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                          {p.product_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.units_sold} sold
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {STORE_CONFIG.currencySymbol} {Number(p.total_revenue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {/* Visual Bar */}
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

        {/* Recent Orders Table */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag size={18} className="text-brand-500" />
                Live Recent Orders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time order feed</p>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              All Orders <ArrowRight size={13} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5">Order Ref</th>
                    <th className="py-2.5">Customer</th>
                    <th className="py-2.5">Payment</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.map((ord) => {
                    const st = ORDER_STATUSES[ord.status] || { label: ord.status, color: '#94a3b8' };
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                          {ord.shipping_address?.recipient_name || 'Customer'}
                        </td>
                        <td className="py-3 uppercase text-[10px] text-slate-500">
                          {ord.payment_method}
                        </td>
                        <td className="py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                            style={{
                              backgroundColor: `${st.color}18`,
                              color: st.color,
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                          {STORE_CONFIG.currencySymbol} {Number(ord.total).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Low-Stock Alert List with 1-Click Restock Actions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Low-Stock Alert List
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Products at or below designated safety stock threshold. Quick restock increments inventory directly.
            </p>
          </div>
          <Link
            to="/inventory"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            Manage Inventory <ArrowRight size={13} />
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold space-y-1">
            <CheckCircle2 size={28} className="mx-auto mb-1.5" />
            <p className="text-sm font-bold">All Stock Levels Healthy</p>
            <p className="text-slate-400 font-normal">No items are currently below low-stock thresholds.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockProducts.map((p) => {
              const isCrit = p.stock === 0;
              const isRestocking = restockingId === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-xs transition ${
                    isCrit
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase mb-1 ${
                          isCrit
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isCrit ? 'Out of Stock' : 'Low Stock'}
                      </span>
                      <h4 className="truncate font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {p.name}
                      </h4>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                        SKU: {p.sku || 'N/A'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-lg font-black ${
                          isCrit ? 'text-rose-600' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {p.stock}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        thr: {p.low_stock_threshold}
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Quick Restock Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">Quick restock:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickRestock(p, 5)}
                        disabled={isRestocking}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                      >
                        {isRestocking ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                        +5
                      </button>
                      <button
                        onClick={() => handleQuickRestock(p, 10)}
                        disabled={isRestocking}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        {isRestocking ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
