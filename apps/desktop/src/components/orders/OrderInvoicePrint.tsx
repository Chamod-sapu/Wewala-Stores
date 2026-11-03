import React from 'react';
import { STORE_CONFIG, OrderStatus } from '@wewala/shared';

export interface PrintOrderItem {
  id?: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

export interface PrintOrderData {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  coupon_code?: string | null;
  total: number;
  shipping_address?: {
    recipient_name?: string;
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  } | null;
  order_items?: PrintOrderItem[];
}

interface OrderInvoicePrintProps {
  orders: PrintOrderData[];
}

export const OrderInvoicePrint: React.FC<OrderInvoicePrintProps> = ({ orders }) => {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="hidden print:block font-sans text-black bg-white">
      {orders.map((order, index) => (
        <div
          key={order.id}
          className={`p-8 max-w-4xl mx-auto bg-white ${
            index < orders.length - 1 ? 'break-after-page' : ''
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                {STORE_CONFIG.name}
              </h1>
              <p className="text-xs text-slate-600">{STORE_CONFIG.tagline}</p>
              <p className="text-xs text-slate-600 mt-1">
                No. 128, High Level Road, Maharagama, Sri Lanka
              </p>
              <p className="text-xs text-slate-600">
                Email: {STORE_CONFIG.contactEmail} | Tel: +94 11 285 4321
              </p>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-black uppercase text-slate-900">TAX INVOICE</h2>
              <p className="font-mono text-xs font-bold text-slate-900 mt-1">
                INV-{order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Date: {new Date(order.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-600">
                Status: <span className="uppercase font-bold">{order.status}</span>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Billed & Shipped To:
              </h3>
              <p className="font-bold text-sm text-slate-900">
                {order.shipping_address?.recipient_name || 'Customer'}
              </p>
              <p className="text-xs text-slate-700">{order.shipping_address?.street_address}</p>
              <p className="text-xs text-slate-700">
                {order.shipping_address?.city}
                {order.shipping_address?.postal_code ? `, ${order.shipping_address.postal_code}` : ''}
              </p>
              <p className="text-xs text-slate-700">{order.shipping_address?.country || 'Sri Lanka'}</p>
              {order.shipping_address?.phone && (
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  Phone: {order.shipping_address.phone}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Payment & Order Info:
              </h3>
              <p className="text-xs text-slate-700">
                Payment Method:{' '}
                <span className="font-bold uppercase text-slate-900">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Credit / Debit Card'}
                </span>
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Payment Status:{' '}
                <span className="font-bold uppercase text-slate-900">
                  {order.payment_status}
                </span>
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Order Reference:{' '}
                <span className="font-mono text-slate-900 font-semibold">
                  {order.id}
                </span>
              </p>
              {order.coupon_code && (
                <p className="text-xs text-slate-700 mt-1">
                  Coupon Applied:{' '}
                  <span className="font-mono font-bold text-emerald-700">
                    {order.coupon_code}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase text-slate-800">
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Total ({STORE_CONFIG.currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {order.order_items?.map((item, i) => (
                <tr key={item.id || i}>
                  <td className="py-2.5 font-medium text-slate-900">{item.name_snapshot}</td>
                  <td className="py-2.5 text-right">
                    {STORE_CONFIG.currencySymbol} {Number(item.price_snapshot).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {STORE_CONFIG.currencySymbol}{' '}
                    {(Number(item.price_snapshot) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>
                  {STORE_CONFIG.currencySymbol} {Number(order.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery / Shipping:</span>
                <span>
                  {order.shipping === 0
                    ? 'FREE'
                    : `${STORE_CONFIG.currencySymbol} ${Number(order.shipping).toLocaleString()}`}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>
                    -{STORE_CONFIG.currencySymbol} {Number(order.discount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span>
                  {STORE_CONFIG.currencySymbol} {Number(order.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500">
            <p>Thank you for shopping with {STORE_CONFIG.name}!</p>
            <p className="mt-0.5">
              For any returns or warranty queries, please present this invoice within 14 days of purchase.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

