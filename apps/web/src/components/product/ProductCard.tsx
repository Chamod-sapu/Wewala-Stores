import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Star, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG, ProductWithImages } from '@wewala/shared';

interface ProductCardProps {
  product: ProductWithImages;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCartStore();
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);

  const imageSrc =
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= product.low_stock_threshold;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    setIsAdding(true);
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: imageSrc,
      stock: product.stock,
    });

    toast.success(`${product.name} added to basket!`, {
      action: {
        label: 'View Basket',
        onClick: () => openCart(),
      },
    });

    setTimeout(() => setIsAdding(false), 600);
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.info('Sign in to save items to your wishlist.');
      return;
    }

    try {
      if (isWishlisted) {
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        setIsWishlisted(false);
        toast('Removed from wishlist');
      } else {
        await supabase.from('wishlist').insert({
          user_id: user.id,
          product_id: product.id,
        });
        setIsWishlisted(true);
        toast.success('Saved to your wishlist!');
      }
    } catch (err: any) {
      console.warn('Wishlist toggle error:', err);
      // Fallback local toggle
      setIsWishlisted(!isWishlisted);
    }
  };

  return (
    <div className="card group relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Image Container */}
      <Link
        to={`/products/${product.slug}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
      >
        <img
          src={imageSrc}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Discount Badge */}
        {discountPercent !== null && (
          <span className="absolute left-1.5 top-1.5 sm:left-2.5 sm:top-2.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-sm">
            -{discountPercent}%
          </span>
        )}

        {/* Stock Badge */}
        <div className="absolute right-1.5 top-1.5 sm:right-2.5 sm:top-2.5">
          {isOutOfStock ? (
            <span className="badge-danger text-[9px] sm:text-[11px] px-1.5 py-0.5 font-semibold">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="badge-warning text-[9px] sm:text-[11px] px-1.5 py-0.5 font-semibold">
              Only {product.stock} left
            </span>
          ) : null}
        </div>

        {/* Wishlist Button Overlay */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 dark:bg-slate-900/90 ${
            isWishlisted ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
          }`}
        >
          <Heart size={14} className="sm:hidden" fill={isWishlisted ? 'currentColor' : 'none'} />
          <Heart size={16} className="hidden sm:block" fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        {/* Category Label */}
        {product.category && (
          <p className="truncate text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
            {product.category.name}
          </p>
        )}

        {/* Product Title */}
        <h3 className="mt-0.5 sm:mt-1 line-clamp-2 text-xs sm:text-sm font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h3>

        {/* Rating Mock/Display */}
        <div className="mt-1 flex items-center gap-1 text-amber-500">
          <Star size={11} className="sm:hidden" fill="currentColor" />
          <Star size={13} className="hidden sm:inline" fill="currentColor" />
          <span className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300">4.8</span>
          <span className="text-[9px] sm:text-[11px] text-slate-400">(24)</span>
        </div>

        {/* Price & Action */}
        <div className="mt-auto pt-2 sm:pt-3">
          <div className="flex items-center justify-between gap-1.5 sm:block">
            {/* Price Column */}
            <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
              <span className="block text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">
                {STORE_CONFIG.currencySymbol} {product.price.toLocaleString()}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="block text-[10px] sm:text-xs text-slate-400 line-through truncate">
                  {STORE_CONFIG.currencySymbol} {product.compare_at_price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Action Button: compact icon-only button on mobile, full-width with label on desktop */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              aria-label={isOutOfStock ? 'Sold Out' : 'Add to Basket'}
              title={isOutOfStock ? 'Sold Out' : 'Add to Basket'}
              className={`flex items-center justify-center font-bold transition active:scale-95 ${
                isOutOfStock
                  ? 'btn-secondary cursor-not-allowed opacity-50'
                  : 'btn-primary'
              } h-8 w-8 shrink-0 rounded-lg sm:mt-3 sm:h-auto sm:w-full sm:py-2 sm:text-xs`}
            >
              {isAdding ? (
                <>
                  <Check size={14} className="animate-bounce" />
                  <span className="hidden sm:inline sm:ml-1.5">Added</span>
                </>
              ) : isOutOfStock ? (
                <>
                  <span className="text-[10px] font-semibold sm:hidden">✕</span>
                  <span className="hidden sm:inline">Sold Out</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span className="hidden sm:inline sm:ml-1.5">Add to Basket</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

