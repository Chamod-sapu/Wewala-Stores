import React from 'react';
import { STORE_CONFIG, OrderStatus } from '@wewala/shared';

export interface SalesReportPrintData {
  dateRangeLabel: string;
  startDateStr: string;
  endDateStr: string;
  generatedAt: string;
  metrics: {
    gross_revenue: number;
    net_revenue: number;
    orders_count: number;
    average_order_value: number;
    refunds_count: number;
    refunds_total: number;
    discounts_total: number;
    shipping_total: number;
  };
  categorySales: {
    category_name: string;
    units_sold: number;
    total_revenue: number;
  }[];
  paymentBreakdown: {
    payment_method: string;
    order_count: number;
    total_revenue: number;
  }[];
  topProducts: {
    product_name: string;
    sku: string | null;
    units_sold: number;
    total_revenue: number;
  }[];
  orders: {
    id: string;
    created_at: string;
    customer_name: string;
    payment_method: string;
    status: OrderStatus;
    total: number;
    discount: number;
  }[];
}

interface SalesReportPrintProps {
  reportData: SalesReportPrintData | null;
}

export const SalesReportPrint: React.FC<SalesReportPrintProps> = ({ reportData }) => {
  if (!reportData) return null;

  const { metrics, dateRangeLabel, startDateStr, endDateStr, generatedAt, categorySales, paymentBreakdown, topProducts, orders } = reportData;

  return (
    <div className="hidden print:block font-sans text-black bg-white p-8 max-w-5xl mx-auto">
      {/* Report Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">
            {STORE_CONFIG.name}
          </h1>
          <p className="text-xs text-slate-700 font-medium">{STORE_CONFIG.tagline}</p>
          <p className="text-xs text-slate-600 mt-1">
            Maharagama Commercial Terminal • Financial Operations
          </p>
          <p className="text-xs text-slate-600">Contact: {STORE_CONFIG.contactEmail}</p>
        </div>

        <div className="text-right">
          <span className="inline-block border-2 border-black px-3 py-1 font-black text-sm uppercase tracking-wider">
            EXECUTIVE SALES REPORT
          </span>
          <p className="font-bold text-xs mt-2">
            Period: <span className="font-black">{dateRangeLabel}</span>
          </p>
          <p className="text-[11px] text-slate-600">
            {startDateStr} to {endDateStr}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Generated: {generatedAt}</p>
        </div>
      </div>

      {/* KPI Financial Overview Grid */}
      <div className="mb-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 border-b border-black pb-1">
          1. Financial Summary Overview
        </h2>
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="border border-black p-3 rounded-lg bg-slate-50">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Net Revenue</span>
            <span className="text-lg font-black text-black">
              {STORE_CONFIG.currencySymbol} {Number(metrics.net_revenue).toLocaleString()}
            </span>
            <span className="block text-[10px] text-slate-500 mt-0.5">Gross minus refunds</span>
          </div>

          <div className="border border-black p-3 rounded-lg bg-slate-50">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Gross Sales</span>
            <span className="text-lg font-black text-black">
              {STORE_CONFIG.currencySymbol} {Number(metrics.gross_revenue).toLocaleString()}
            </span>
            <span className="block text-[10px] text-slate-500 mt-0.5">From non-cancelled orders</span>
          </div>

          <div className="border border-black p-3 rounded-lg bg-slate-50">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Total Orders</span>
            <span className="text-lg font-black text-black">{metrics.orders_count}</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">
              Avg Order: {STORE_CONFIG.currencySymbol} {Number(metrics.average_order_value).toLocaleString()}
            </span>
          </div>

          <div className="border border-black p-3 rounded-lg bg-slate-50">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Total Refunds</span>
            <span className="text-lg font-black text-rose-700">
              {STORE_CONFIG.currencySymbol} {Number(metrics.refunds_total).toLocaleString()}
            </span>
            <span className="block text-[10px] text-slate-500 mt-0.5">
              {metrics.refunds_count} refunded order{metrics.refunds_count === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Channel Breakdown & Category Distribution */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="border border-black rounded-lg p-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
            Payment Gateways & Settlement
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-600">
                <th className="py-1">Method</th>
                <th className="py-1 text-center">Orders</th>
                <th className="py-1 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paymentBreakdown.map((p) => (
                <tr key={p.payment_method}>
                  <td className="py-1.5 font-bold uppercase">
                    {p.payment_method === 'cod' ? 'Cash on Delivery' : 'Credit / Debit Card'}
                  </td>
                  <td className="py-1.5 text-center">{p.order_count}</td>
                  <td className="py-1.5 text-right font-bold">
                    {STORE_CONFIG.currencySymbol} {Number(p.total_revenue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category Breakdown */}
        <div className="border border-black rounded-lg p-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
            Department / Category Performance
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-600">
                <th className="py-1">Category</th>
                <th className="py-1 text-center">Units</th>
                <th className="py-1 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categorySales.map((c) => (
                <tr key={c.category_name}>
                  <td className="py-1.5 font-medium">{c.category_name}</td>
                  <td className="py-1.5 text-center font-bold">{c.units_sold}</td>
                  <td className="py-1.5 text-right font-bold">
                    {STORE_CONFIG.currencySymbol} {Number(c.total_revenue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 Best-Selling SKUs */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-black pb-1">
          Top-Selling Products (by Revenue)
        </h3>
        <table className="w-full text-left text-xs border border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-[10px] font-bold uppercase text-black">
              <th className="py-1.5 px-2">#</th>
              <th className="py-1.5 px-2">Product Title</th>
              <th className="py-1.5 px-2">SKU</th>
              <th className="py-1.5 px-2 text-center">Units Sold</th>
              <th className="py-1.5 px-2 text-right">Gross Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {topProducts.map((p, idx) => (
              <tr key={p.product_name + idx}>
                <td className="py-1.5 px-2 font-bold">{idx + 1}</td>
                <td className="py-1.5 px-2 font-semibold">{p.product_name}</td>
                <td className="py-1.5 px-2 font-mono text-[10px]">{p.sku || 'N/A'}</td>
                <td className="py-1.5 px-2 text-center font-bold">{p.units_sold}</td>
                <td className="py-1.5 px-2 text-right font-bold">
                  {STORE_CONFIG.currencySymbol} {Number(p.total_revenue).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Sample */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-black pb-1">
          Sample Order Records ({Math.min(orders.length, 25)} of {orders.length} transactions)
        </h3>
        <table className="w-full text-left text-[11px] border border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold uppercase text-black text-[10px]">
              <th className="py-1 px-2">Order Ref</th>
              <th className="py-1 px-2">Date</th>
              <th className="py-1 px-2">Customer</th>
              <th className="py-1 px-2">Payment</th>
              <th className="py-1 px-2">Status</th>
              <th className="py-1 px-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {orders.slice(0, 25).map((o) => (
              <tr key={o.id}>
                <td className="py-1 px-2 font-mono font-bold">#{o.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-1 px-2">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="py-1 px-2">{o.customer_name}</td>
                <td className="py-1 px-2 uppercase text-[10px]">{o.payment_method}</td>
                <td className="py-1 px-2 capitalize">{o.status}</td>
                <td className="py-1 px-2 text-right font-bold">
                  {STORE_CONFIG.currencySymbol} {Number(o.total).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sign-off Block */}
      <div className="mt-8 border-t-2 border-black pt-4 grid grid-cols-2 gap-8 text-xs">
        <div>
          <p className="font-bold">Prepared By Operations Management:</p>
          <div className="mt-6 border-b border-black w-48" />
        </div>
        <div className="text-right">
          <p className="font-bold">Certified Financial Officer Audit:</p>
          <div className="mt-6 border-b border-black w-48 ml-auto" />
        </div>
      </div>
    </div>
  );
};

