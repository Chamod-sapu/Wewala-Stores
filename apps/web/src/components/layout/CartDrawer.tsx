import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

const CURRENCY = 'Rs.';
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 350;

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal } = useCartStore();
  const sub = subtotal();
  const shipping = sub >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : SHIPPING_FEE;
  const total = sub + shipping;

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart size={20} className="text-brand-600" />
            Your Basket
            {items.length > 0 && (
              <span className="badge-brand ml-1">{items.reduce((s, i) => s + i.quantity, 0)}</span>
            )}
          </h2>
          <button onClick={closeCart} className="btn-ghost rounded-full p-1.5" aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
              <p className="text-slate-600 dark:text-slate-400">Your basket is empty</p>
              <button onClick={closeCart} className="btn-primary mt-4 text-sm">Continue Shopping</button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-medium leading-tight">{item.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-brand-700 dark:text-brand-400">
                      {CURRENCY} {(item.price * item.quantity).toLocaleString()}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with totals */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{CURRENCY} {sub.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery</span>
                <span>
                  {shipping === 0
                    ? <span className="font-medium text-emerald-600">FREE</span>
                    : `${CURRENCY} ${shipping}`}
                </span>
              </div>
              {sub < FREE_SHIPPING_THRESHOLD && sub > 0 && (
                <p className="text-xs text-slate-500">
                  Add {CURRENCY} {(FREE_SHIPPING_THRESHOLD - sub).toLocaleString()} more for free delivery
                </p>
              )}
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-bold dark:border-slate-700">
                <span>Total</span>
                <span>{CURRENCY} {total.toLocaleString()}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn-primary mt-4 w-full"
            >
              Proceed to Checkout
              <ArrowRight size={16} />
            </Link>
            <button onClick={closeCart} className="btn-ghost mt-2 w-full text-sm">
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

