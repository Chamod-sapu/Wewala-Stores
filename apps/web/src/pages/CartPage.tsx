import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Tag,
  Check,
  X,
  Truck,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG } from '@wewala/shared';

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    coupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    shippingFee,
    discountAmount,
    total,
    totalItems,
  } = useCartStore();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const sub = subtotal();
  const shipping = shippingFee();
  const discount = discountAmount();
  const grandTotal = total();
  const itemCount = totalItems();

  const freeShippingThreshold = STORE_CONFIG.freeShippingThreshold;
  const progressToFreeShipping = Math.min(100, Math.round((sub / freeShippingThreshold) * 100));
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - sub);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsValidatingCoupon(true);
    try {
      // Query coupons from Supabase
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Check standard demo codes
        if (code === 'WELCOME10') {
          const res = applyCoupon({
            code: 'WELCOME10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderAmount: 2000,
            maxDiscount: 1000,
          });
          if (res.success) {
            toast.success(res.message);
            setCouponCodeInput('');
          } else {
            toast.error(res.message);
          }
          return;
        } else if (code === 'WEWALA500') {
          const res = applyCoupon({
            code: 'WEWALA500',
            discountType: 'fixed',
            discountValue: 500,
            minOrderAmount: 3500,
            maxDiscount: null,
          });
          if (res.success) {
            toast.success(res.message);
            setCouponCodeInput('');
          } else {
            toast.error(res.message);
          }
          return;
        }

        toast.error(`Coupon code "${code}" is invalid or expired.`);
        return;
      }

      // Check expiry date if set
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error(`Coupon "${code}" has expired.`);
        return;
      }

      // Check usage limits if set
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        toast.error(`Coupon "${code}" has reached its maximum usage limit.`);
        return;
      }

      const res = applyCoupon({
        code: data.code,
        discountType: data.discount_type as 'percentage' | 'fixed',
        discountValue: Number(data.discount_value),
        minOrderAmount: Number(data.min_order_amount || 0),
        maxDiscount: data.max_discount ? Number(data.max_discount) : null,
      });

      if (res.success) {
        toast.success(res.message);
        setCouponCodeInput('');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      console.warn('Coupon validation error:', err);
      toast.error('Unable to validate coupon code at this time.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="section-container py-20 text-center space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-900">
          <ShoppingCart size={48} className="opacity-60" />
        </div>
        <div className="space-y-2">
          <h1 className="page-title">Your Basket is Empty</h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You don't have any items in your basket yet. Check out our fresh grocery staples, island vegetables, and Ceylon teas!
          </p>
        </div>
        <div className="pt-2">
          <Link to="/products" className="btn-primary py-3 px-8 text-sm font-bold shadow-md">
            Start Shopping Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container py-10 space-y-8">
      {/* Page Title & Clear Cart */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="page-title">Your Shopping Basket</h1>
          <p className="mt-1 text-xs text-slate-500">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in basket
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to remove all items from your basket?')) {
              clearCart();
              toast('Basket emptied');
            }
          }}
          className="btn-ghost text-xs text-red-600 hover:text-red-700 dark:text-red-400"
        >
          <Trash2 size={14} /> Clear Basket
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free Shipping Progress Meter */}
          <div className="card p-4 bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/50">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-brand-800 dark:text-brand-300">
                <Truck size={16} />
                {sub >= freeShippingThreshold ? (
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    Congratulations! You unlocked FREE Delivery!
                  </strong>
                ) : (
                  <>
                    Add{' '}
                    <strong className="text-brand-700 dark:text-brand-300">
                      {STORE_CONFIG.currencySymbol} {amountNeededForFreeShipping.toLocaleString()}
                    </strong>{' '}
                    more for FREE Delivery
                  </>
                )}
              </span>
              <span className="text-slate-500">{progressToFreeShipping}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-brand-600 transition-all duration-500"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Cart Items Cards */}
          <div className="space-y-3">
            {items.map((item) => {
              const lineTotal = item.price * item.quantity;
              const isAtMaxStock = item.quantity >= item.stock;

              return (
                <div
                  key={item.productId}
                  className="card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ShoppingCart size={24} />
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                        <Link
                          to={`/products/${item.id}`}
                          className="hover:text-brand-600 dark:hover:text-brand-400 transition"
                        >
                          {item.name}
                        </Link>
                      </h3>
                      {item.sku && (
                        <p className="font-mono text-[11px] text-slate-400">SKU: {item.sku}</p>
                      )}
                      <p className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {STORE_CONFIG.currencySymbol} {item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    {/* Quantity Selector */}
                    <div>
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={isAtMaxStock}
                          className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      {isAtMaxStock && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          Max stock ({item.stock})
                        </span>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[90px]">
                      <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
                        {STORE_CONFIG.currencySymbol} {lineTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Link
              to="/products"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 inline-flex items-center gap-1"
            >
              <ArrowRight size={14} className="rotate-180" /> Continue browsing products
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
              Order Summary
            </h2>

            {/* Coupon Box */}
            <div>
              <label className="label text-xs mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-brand-600" /> Apply Discount Coupon
              </label>

              {coupon ? (
                <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3 text-xs text-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold uppercase">{coupon.code}</span>
                    <p className="text-[11px] opacity-80">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `${STORE_CONFIG.currencySymbol} ${coupon.discountValue} OFF`}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="btn-ghost p-1 text-slate-400 hover:text-red-600"
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    placeholder="e.g. WELCOME10"
                    className="input text-xs py-2 uppercase font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isValidatingCoupon || !couponCodeInput.trim()}
                    className="btn-secondary text-xs px-4 font-bold shrink-0"
                  >
                    {isValidatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {STORE_CONFIG.currencySymbol} {sub.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                <span>
                  {shipping === 0 ? (
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                      FREE
                    </strong>
                  ) : (
                    `${STORE_CONFIG.currencySymbol} ${shipping.toLocaleString()}`
                  )}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Coupon Discount ({coupon?.code})</span>
                  <span>
                    -{STORE_CONFIG.currencySymbol} {discount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-sm font-extrabold text-slate-900 dark:text-white dark:border-slate-700">
                <span>Grand Total</span>
                <span className="text-base text-brand-700 dark:text-brand-400">
                  {STORE_CONFIG.currencySymbol} {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link
              to="/checkout"
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </Link>

            {/* Trust Assurances */}
            <div className="pt-2 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-600" /> Secure Card and Cash on Delivery
              </p>
              <p className="flex items-center gap-1.5">
                <Truck size={14} className="text-brand-600" /> Direct delivery across Western Province
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
