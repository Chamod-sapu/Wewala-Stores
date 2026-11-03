import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RotateCcw,
  XCircle,
  Printer,
  CreditCard,
  Building,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { STORE_CONFIG, ORDER_STATUSES, OrderStatus, PaymentMethod } from '@wewala/shared';
import { useCartStore } from '@/store/cartStore';

interface OrderDetailItem {
  id: string;
  product_id?: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

interface OrderDetail {
  id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shipping_address: {
    recipient_name?: string;
    phone?: string;
    street_address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  coupon_code?: string | null;
  created_at: string;
  order_items?: OrderDetailItem[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', id)
          .single();

        if (err) throw err;
        setOrder(data as unknown as OrderDetail);
      } catch (err: any) {
        console.warn('Could not fetch order from Supabase:', err);
        setError(err.message || 'Order not found');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id]);

  // Handle Cancel Order
  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;

    setIsCancelling(true);
    try {
      // 1. Try atomic cancel_order RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_order', {
        p_order_id: order.id,
      });

      if (rpcErr) {
        console.warn('RPC cancel_order failed, attempting direct status update:', rpcErr);
        // Fallback direct update
        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateErr) throw updateErr;
      }

      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      setShowCancelModal(false);
      toast.success('Order has been cancelled successfully.');
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      toast.error(err.message || 'Failed to cancel order. Please contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Reorder
  const handleReorder = () => {
    if (!order || !order.order_items || order.order_items.length === 0) {
      toast.error('No items found in this order to reorder.');
      return;
    }

    order.order_items.forEach((item) => {
      addItem({
        id: item.product_id || item.id,
        productId: item.product_id || item.id,
        name: item.name_snapshot,
        price: Number(item.price_snapshot),
        quantity: item.quantity,
        stock: 99,
        imageUrl: null,
      });
    });

    toast.success('Items added to your shopping cart!');
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="section-container py-10">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div className="card p-6 space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="section-container py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <AlertCircle size={32} />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Order Details</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {error || 'Unable to load order details for this ID.'}
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">ID: {id}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
          <Link to="/products" className="btn-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = ORDER_STATUSES[order.status] || { label: order.status, color: 'blue' };

  // Calculate timeline stage index
  // 0: pending, 1: paid / processing, 2: shipped, 3: delivered
  const timelineStages = [
    { key: 'pending', label: 'Order Placed', desc: 'Received & verified' },
    { key: 'processing', label: 'Processing', desc: 'Packaging items' },
    { key: 'shipped', label: 'Dispatched', desc: 'With courier' },
    { key: 'delivered', label: 'Delivered', desc: 'Handed over' },
  ];

  let currentStageIndex = 0;
  if (order.status === 'processing' || order.status === 'paid') currentStageIndex = 1;
  else if (order.status === 'shipped') currentStageIndex = 2;
  else if (order.status === 'delivered') currentStageIndex = 3;

  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';

  return (
    <>
      {/* ============================================================== */}
      {/* 1. SCREEN VIEW (Hidden when printing invoice)                 */}
      {/* ============================================================== */}
      <div className="section-container py-10 print:hidden">
        {/* Navigation & Actions Top Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/account" className="btn-ghost text-sm inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to My Orders
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {/* Reorder Button */}
            <button
              onClick={handleReorder}
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <RotateCcw size={15} /> Reorder Items
            </button>

            {/* Print Invoice Button */}
            <button
              onClick={() => window.print()}
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Printer size={15} /> Print Invoice
            </button>

            {/* Cancel Order Button (active only if order is still pending) */}
            {isPending && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="btn-danger text-sm inline-flex items-center gap-2"
              >
                <XCircle size={15} /> Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Header Summary Banner */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Package className="text-brand-600 dark:text-brand-400" size={28} />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </h1>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">ID: {order.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`badge text-sm font-semibold px-3 py-1 capitalize ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                    : order.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                }`}
              >
                Status: {statusConfig.label}
              </span>
              <span className="text-xs text-slate-500">
                Placed on {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cancellation Banner */}
          {isCancelled && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">This order has been cancelled.</p>
                <p className="mt-0.5">
                  Reserved stock has been returned to store inventory. No charges were captured.
                </p>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {!isCancelled && (
            <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                Order Progress Timeline
              </h2>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {timelineStages.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stage.key} className="relative">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isCompleted
                              ? 'bg-brand-600 text-white dark:bg-brand-500'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          } ${isCurrent ? 'ring-4 ring-brand-100 dark:ring-brand-950' : ''}`}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isCompleted
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {stage.label}
                          </p>
                          <p className="text-[11px] text-slate-500">{stage.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content Details Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Ordered Items Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Ordered Items ({order.order_items?.length || 0})
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.order_items && order.order_items.length > 0 ? (
                  order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.name_snapshot}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Qty: {item.quantity} × {STORE_CONFIG.currencySymbol}{' '}
                          {item.price_snapshot.toLocaleString()}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {STORE_CONFIG.currencySymbol}{' '}
                        {(item.price_snapshot * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-sm text-slate-500">Item details recorded with order.</p>
                )}
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Truck size={20} className="text-brand-600 dark:text-brand-400" /> Delivery Address
              </h2>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {order.shipping_address?.recipient_name || 'Customer'}
                </p>
                <p>{order.shipping_address?.street_address}</p>
                <p>
                  {order.shipping_address?.city}{' '}
                  {order.shipping_address?.postal_code && `- ${order.shipping_address?.postal_code}`}
                </p>
                <p>{order.shipping_address?.country || 'Sri Lanka'}</p>
                {order.shipping_address?.phone && (
                  <p className="pt-2 text-xs font-semibold text-slate-700 dark:text-slate-400">
                    Contact Phone: {order.shipping_address.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment & Totals Summary Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Payment Summary
              </h2>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="font-semibold uppercase text-slate-900 dark:text-white">
                    {order.payment_method === 'card' ? 'Credit / Debit Card' : 'Cash on Delivery (COD)'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span
                    className={`font-semibold capitalize ${
                      order.payment_status === 'paid'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>

                <hr className="my-2 border-slate-100 dark:border-slate-800" />

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {STORE_CONFIG.currencySymbol} {order.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>
                    {order.shipping === 0
                      ? 'FREE'
                      : `${STORE_CONFIG.currencySymbol} ${order.shipping.toLocaleString()}`}
                  </span>
                </div>

                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>
                      -{STORE_CONFIG.currencySymbol} {order.discount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                  <span>Total Amount</span>
                  <span className="text-brand-600 dark:text-brand-400 text-lg">
                    {STORE_CONFIG.currencySymbol} {order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Atomic Guarantee Note */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white">Verified Transaction</p>
                  <p className="mt-0.5">
                    Order processed with transactional stock security, inventory auditing, and customer protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. PRINTABLE INVOICE VIEW (Visible ONLY when printing)        */}
      {/* ============================================================== */}
      <div className="hidden print:block p-8 bg-white text-black max-w-4xl mx-auto font-sans">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {STORE_CONFIG.name}
            </h1>
            <p className="text-xs text-slate-600">{STORE_CONFIG.tagline}</p>
            <p className="text-xs text-slate-600">No. 128, High Level Road, Maharagama, Sri Lanka</p>
            <p className="text-xs text-slate-600">Email: {STORE_CONFIG.contactEmail} | Tel: +94 11 285 4321</p>
          </div>

          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-slate-800">TAX INVOICE</h2>
            <p className="font-mono text-xs font-bold text-slate-900 mt-1">
              Invoice #: INV-{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-slate-600">
              Date: {new Date(order.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-slate-600">
              Payment Method: <span className="uppercase font-semibold">{order.payment_method}</span>
            </p>
            <p className="text-xs text-slate-600">
              Payment Status: <span className="uppercase font-semibold">{order.payment_status}</span>
            </p>
          </div>
        </div>

        {/* Customer & Delivery Address */}
        <div className="mb-6 rounded-lg border border-slate-200 p-4 bg-slate-50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Billed & Shipped To:</h3>
          <p className="font-bold text-sm text-slate-900">{order.shipping_address?.recipient_name}</p>
          <p className="text-xs text-slate-700">{order.shipping_address?.street_address}</p>
          <p className="text-xs text-slate-700">
            {order.shipping_address?.city}, {order.shipping_address?.postal_code}
          </p>
          <p className="text-xs text-slate-700">{order.shipping_address?.country}</p>
          {order.shipping_address?.phone && (
            <p className="text-xs text-slate-700 font-medium mt-1">Phone: {order.shipping_address.phone}</p>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-left border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-slate-800 text-xs font-bold uppercase text-slate-700">
              <th className="py-2">Item Description</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Total ({STORE_CONFIG.currencySymbol})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {order.order_items?.map((item) => (
              <tr key={item.id}>
                <td className="py-2 font-medium">{item.name_snapshot}</td>
                <td className="py-2 text-right">
                  {STORE_CONFIG.currencySymbol} {item.price_snapshot.toLocaleString()}
                </td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right font-semibold">
                  {STORE_CONFIG.currencySymbol} {(item.price_snapshot * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Invoice Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {STORE_CONFIG.currencySymbol} {order.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee:</span>
              <span className="font-semibold text-slate-900">
                {order.shipping === 0
                  ? 'FREE'
                  : `${STORE_CONFIG.currencySymbol} ${order.shipping.toLocaleString()}`}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount {order.coupon_code && `(${order.coupon_code})`}:</span>
                <span className="font-semibold">
                  -{STORE_CONFIG.currencySymbol} {order.discount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span>
                {STORE_CONFIG.currencySymbol} {order.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-slate-300 pt-4 text-center text-[10px] text-slate-500">
          <p>Thank you for shopping with Wewala Stores! Please retain this invoice for your warranty and records.</p>
          <p className="mt-0.5">Wewala Stores e-Commerce Platform • All Rights Reserved</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CANCEL ORDER CONFIRMATION MODAL                            */}
      {/* ============================================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Order?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to cancel Order #{order.id.slice(0, 8).toUpperCase()}? The
              reserved stock will be returned to the store. This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-ghost"
                disabled={isCancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="btn-danger inline-flex items-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
