import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  Printer,
  ShoppingBag,
  Clock,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, OrderStatus, PaymentMethod } from '@wewala/shared';
import { Skeleton } from '@/components/ui/SkeletonLoader';

interface OrderSuccessData {
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
  order_items?: {
    id: string;
    name_snapshot: string;
    price_snapshot: number;
    quantity: number;
  }[];
}

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentState = searchParams.get('payment');

  const [order, setOrder] = useState<OrderSuccessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data as unknown as OrderSuccessData);
      } catch (err) {
        console.warn('Could not load confirmed order:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="section-container py-16 text-center">
        <Skeleton className="mx-auto h-16 w-16 rounded-full mb-6" />
        <Skeleton className="mx-auto h-8 w-64 mb-3" />
        <Skeleton className="mx-auto h-4 w-96 mb-8" />
        <div className="mx-auto max-w-xl space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="section-container py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Package size={32} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Order Not Found</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          No order reference was provided in the URL.
        </p>
        <div className="mt-6">
          <Link to="/products" className="btn-primary">
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        {/* Celebration Header */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 size={44} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Thank You for Your Order!
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            Your order has been received and is being processed by our store team.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
            <span>Order Reference:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">{orderId}</span>
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 to-slate-50 p-6 dark:border-slate-800 dark:from-brand-950/20 dark:to-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Current Status
                </p>
                <h3 className="mt-0.5 text-lg font-bold capitalize text-slate-900 dark:text-white">
                  {order ? order.status : 'Processing'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge-brand text-xs font-semibold uppercase px-3 py-1">
                  Payment:{' '}
                  {paymentState === 'cod'
                    ? 'Cash on Delivery'
                    : order?.payment_status === 'paid'
                    ? 'Paid'
                    : 'Authorized'}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps Progress Flow */}
          <div className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              What Happens Next
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 size={16} /> 1. Order Verified
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Stock reserved atomically and order sent to fulfillment.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
                  <Clock size={16} /> 2. Packaging
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Items are quality-checked and packaged safely for transit.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold text-sm">
                  <Truck size={16} /> 3. Dispatch
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Handed to our courier for 1-3 business day doorstep delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Order Details & Summary Card if fetched */}
          {order && (
            <div className="border-t border-slate-100 p-6 dark:border-slate-800 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Shipping details */}
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <Truck size={16} className="text-brand-600" /> Delivery Address
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {order.shipping_address?.recipient_name}
                  </p>
                  <p>{order.shipping_address?.street_address}</p>
                  <p>
                    {order.shipping_address?.city}, {order.shipping_address?.postal_code}
                  </p>
                  <p>{order.shipping_address?.country}</p>
                  <p className="pt-1">Phone: {order.shipping_address?.phone}</p>
                </div>

                {/* Totals Breakdown */}
                <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/50 space-y-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <CreditCard size={16} className="text-brand-600" /> Payment & Total
                  </p>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>
                      {STORE_CONFIG.currencySymbol} {order.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Shipping</span>
                    <span>
                      {order.shipping === 0
                        ? 'FREE'
                        : `${STORE_CONFIG.currencySymbol} ${order.shipping.toLocaleString()}`}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount</span>
                      <span>
                        -{STORE_CONFIG.currencySymbol} {order.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-700 dark:text-white flex justify-between text-sm">
                    <span>Total</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      {STORE_CONFIG.currencySymbol} {order.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to={`/orders/${orderId}`} className="btn-primary inline-flex items-center gap-2">
            View Order Details <ArrowRight size={16} />
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Printer size={16} /> Print Confirmation
          </button>
          <Link to="/products" className="btn-ghost inline-flex items-center gap-2">
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

