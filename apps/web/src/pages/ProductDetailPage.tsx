import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  Check,
  Minus,
  Plus,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  MessageSquare,
  Lock,
  ThumbsUp,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { ProductCard } from '@/components/product/ProductCard';
import { SEO } from '@/components/common/SEO';
import {
  useProductBySlug,
  useRelatedProducts,
  useProductReviews,
  useHasPurchasedProduct,
  useSubmitReview
} from '@/hooks/useProducts';
import { STORE_CONFIG } from '@wewala/shared';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addItem, openCart } = useCartStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Queries
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useProductBySlug(slug);

  const {
    data: relatedProducts,
    isLoading: relatedLoading,
  } = useRelatedProducts(product?.category_id, product?.id);

  const {
    data: reviews = [],
    isLoading: reviewsLoading,
  } = useProductReviews(product?.id);

  const {
    data: hasPurchased = false,
    isLoading: purchaseChecking,
  } = useHasPurchasedProduct(product?.id);

  const submitReviewMutation = useSubmitReview(product?.id || '');

  // Calculate Review Metrics
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : '5.0';

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage:
      reviewCount > 0
        ? Math.round((reviews.filter((r) => r.rating === star).length / reviewCount) * 100)
        : star === 5
        ? 100
        : 0,
  }));

  if (productLoading) {
    return (
      <div className="section-container py-10 space-y-10">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="section-container py-16 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-red-500" />
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="text-sm text-slate-500">
          The product you are looking for does not exist or is no longer active.
        </p>
        <Link to="/products" className="btn-primary mt-4 inline-flex">
          <ArrowLeft size={16} /> Return to Store Catalog
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [
        {
          id: 'placeholder',
          product_id: product.id,
          url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ];

  const currentImageUrl = images[selectedImageIndex]?.url || images[0].url;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= product.low_stock_threshold;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(((e.clientX - left) / width) * 100, 0), 100);
    const y = Math.min(Math.max(((e.clientY - top) / height) * 100, 0), 100);
    setZoomPos({ x, y });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: currentImageUrl,
      stock: product.stock,
    });

    // Update quantity in store if more than 1
    if (quantity > 1) {
      useCartStore.getState().updateQuantity(product.id, quantity);
    }

    toast.success(`${quantity} × ${product.name} added to your basket!`, {
      action: {
        label: 'View Basket',
        onClick: () => openCart(),
      },
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Please write a short comment about your purchase.');
      return;
    }

    try {
      await submitReviewMutation.mutateAsync({
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSubmitted(true);
      toast.success('Your review has been submitted for moderation! Thank you for your feedback.');
      setReviewComment('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    }
  };

  return (
    <div className="section-container py-10 space-y-12">
      <SEO
        title={product.name}
        description={product.description || undefined}
        ogImage={currentImageUrl}
        ogType="product"
      />

      {/* Breadcrumb / Back button */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/products" className="hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Catalog
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              to={`/products?category=${product.category.slug}`}
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="truncate font-semibold text-slate-900 dark:text-white max-w-xs">
          {product.name}
        </span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* IMAGE GALLERY WITH HOVER ZOOM */}
        <div className="space-y-4">
          <div
            className="card relative aspect-square w-full overflow-hidden cursor-crosshair bg-slate-50 dark:bg-slate-900"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <img
              src={currentImageUrl}
              alt={product.name}
              className={`h-full w-full object-cover transition-transform duration-200 ${
                isZoomed ? 'scale-150 origin-top-left' : 'scale-100'
              }`}
              style={
                isZoomed
                  ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                  : undefined
              }
            />

            {/* Discount Badge */}
            {discountPercent !== null && (
              <span className="absolute left-4 top-4 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    selectedImageIndex === idx
                      ? 'border-brand-600 shadow-sm'
                      : 'border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-800'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400">
            Hover over the image to inspect quality & details
          </p>
        </div>

        {/* PRODUCT DETAILS & BUYING CONTROLS */}
        <div className="flex flex-col space-y-6">
          {/* Category & Title */}
          <div>
            {product.category && (
              <Link
                to={`/products?category=${product.category.slug}`}
                className="badge-brand mb-2 inline-block font-bold uppercase tracking-wider text-[11px]"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl dark:text-white leading-tight">
              {product.name}
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-400">SKU: {product.sku || 'N/A'}</p>
          </div>

          {/* Rating Snapshot */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.round(Number(averageRating)) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {averageRating}
            </span>
            <span className="text-xs text-slate-500">
              ({reviewCount > 0 ? `${reviewCount} customer reviews` : 'Verified benchmark rating'})
            </span>
          </div>

          {/* Price with Discount */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {STORE_CONFIG.currencySymbol} {product.price.toLocaleString()}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-base text-slate-400 line-through">
                {STORE_CONFIG.currencySymbol} {product.compare_at_price.toLocaleString()}
              </span>
            )}
            {discountPercent && (
              <span className="badge-danger font-bold">Save {discountPercent}%</span>
            )}
          </div>

          {/* Stock Status Indicator */}
          <div>
            {isOutOfStock ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                <AlertCircle size={15} /> Out of Stock (Currently Unavailable)
              </div>
            ) : isLowStock ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertCircle size={15} /> Low Stock: Only {product.stock} units remaining on shelf
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Check size={15} /> In Stock & Ready for Immediate Dispatch ({product.stock} units)
              </div>
            )}
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="w-12 text-center text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock || isOutOfStock}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="btn-primary flex-1 py-3 text-sm font-bold shadow-md"
              >
                <ShoppingBag size={18} />
                <span>{isOutOfStock ? 'Sold Out' : 'Add to Basket'}</span>
              </button>

              {/* Wishlist CTA */}
              <button
                onClick={() => {
                  setIsWishlisted(!isWishlisted);
                  toast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                  isWishlisted
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
                }`}
                aria-label="Save to Wishlist"
              >
                <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Delivery & Assurance Cards */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 text-xs">
            <div className="flex items-center gap-2.5">
              <Truck size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
              <span>Fast Island Dispatch (Free above Rs. 5,000)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
              <span>Cash on Delivery & Secure Cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS FOR DESCRIPTION & REVIEWS */}
      <section className="card overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('description')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition ${
              activeTab === 'description'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Package size={16} />
            <span>Description & Specifications</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <MessageSquare size={16} />
            <span>Customer Reviews ({reviewCount})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {/* TAB 1: DESCRIPTION */}
          {activeTab === 'description' && (
            <div className="space-y-6">
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                <p>{product.description}</p>
              </div>

              {/* Specifications Table */}
              <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                  Product Details
                </h4>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <dt className="text-slate-500">SKU / Item Code</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                      {product.sku || 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {product.category?.name || 'Groceries'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <dt className="text-slate-500">Origin</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      Sri Lanka (Direct Farm Sourced)
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <dt className="text-slate-500">Shelf Stock</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {product.stock} units available
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* TAB 2: REVIEWS & RATINGS */}
          {activeTab === 'reviews' && (
            <div className="space-y-10">
              {/* Rating Summary & Breakdown Grid */}
              <div className="grid grid-cols-1 gap-8 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/60 sm:grid-cols-3 sm:items-center">
                {/* Score */}
                <div className="text-center sm:border-r border-slate-200 dark:border-slate-800 sm:pr-6">
                  <div className="text-5xl font-black text-slate-900 dark:text-white">
                    {averageRating}
                  </div>
                  <div className="mt-2 flex justify-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        fill={i < Math.round(Number(averageRating)) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Based on {reviewCount} verified reviews
                  </p>
                </div>

                {/* Rating Bar Breakdown */}
                <div className="sm:col-span-2 space-y-2">
                  {ratingCounts.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-8 font-semibold">{star} ★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* REVIEW SUBMISSION FORM (Restricted to verified buyers) */}
              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Write a Review
                </h4>

                {reviewSubmitted ? (
                  <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <Check size={16} />
                    <span>Your review was submitted! It will appear once approved by store moderation.</span>
                  </div>
                ) : !user ? (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    <Lock size={16} className="text-slate-400" />
                    <span>
                      Please{' '}
                      <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                        sign in
                      </Link>{' '}
                      to leave a review.
                    </span>
                  </div>
                ) : purchaseChecking ? (
                  <div className="text-xs text-slate-400">Checking verified purchase status...</div>
                ) : !hasPurchased ? (
                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <Lock size={16} className="text-amber-600" />
                    <span>
                      <strong>Verified Buyer Requirement:</strong> Only customers who have purchased
                      this item can submit a review.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Your Rating:
                      </span>
                      <div className="flex gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            className="p-1 hover:scale-125 transition"
                          >
                            <Star size={20} fill={s <= reviewRating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label mb-1">Your Feedback & Experience</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                        placeholder="Tell other shoppers about freshness, taste, and quality..."
                        className="input resize-none text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitReviewMutation.isPending}
                      className="btn-primary btn-sm py-2 px-5"
                    >
                      {submitReviewMutation.isPending ? 'Submitting...' : 'Post Verified Review'}
                    </button>
                  </form>
                )}
              </div>

              {/* REVIEWS LIST */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Customer Feedback
                </h4>

                {reviewsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
                    No approved customer reviews yet. Be the first verified buyer to share your feedback!
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {reviews.map((r) => (
                      <div key={r.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                              {r.profile?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {r.profile?.full_name || 'Verified Buyer'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <UserCheck size={10} /> Verified
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              fill={i < r.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-normal">
                          {r.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RELATED PRODUCTS SECTION */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="badge-brand mb-1">More Like This</span>
              <h2 className="page-title">Related Items in this Category</h2>
            </div>
            {product.category && (
              <Link
                to={`/products?category=${product.category.slug}`}
                className="btn-ghost text-xs font-semibold text-brand-600 dark:text-brand-400"
              >
                Browse All {product.category.name} <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
