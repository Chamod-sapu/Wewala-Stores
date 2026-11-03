import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  Leaf,
  Star,
  Tag,
  Copy,
  Check,
  Mail,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PackageOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/SkeletonLoader';
import { SEO } from '@/components/common/SEO';
import {
  useCategories,
  useFeaturedProducts,
  useNewArrivals
} from '@/hooks/useProducts';

const VALUE_PROPS = [
  {
    icon: Truck,
    title: 'Free Delivery',
    desc: 'On orders over Rs. 5,000 across Colombo & Western Province',
  },
  {
    icon: Leaf,
    title: '100% Farm Direct',
    desc: 'Sourced directly from local certified smallholder farms',
  },
  {
    icon: ShieldCheck,
    title: 'Guaranteed Live Stock',
    desc: 'Real-time inventory reserve to avoid ghost orders',
  },
  {
    icon: Star,
    title: 'Customer Satisfaction',
    desc: '4.8/5 rating from over 3,500 loyal island households',
  },
];

export default function HomePage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // React Query hooks
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const {
    data: featuredProducts,
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedProducts();

  const {
    data: newArrivals,
    isLoading: newArrivalsLoading,
    isError: newArrivalsError,
    refetch: refetchNewArrivals,
  } = useNewArrivals();

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setNewsletterSubscribed(true);
    toast.success('Thank you for subscribing! Check your inbox for exclusive farm deals.');
    setNewsletterEmail('');
  };

  return (
    <div className="space-y-16 pb-16">
      <SEO
        title="Fresh Produce, Heirloom Spices & Ceylon Teas"
        description="Delivering authentic Sri Lankan heirloom rice, organic highland vegetables, and single-origin Ceylon artisan teas straight to your kitchen table."
      />

      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 py-20 text-white md:py-28">
        <div className="section-container relative z-10">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400" />
              Fresh Harvest Just Arrived · Same-Day Delivery
            </span>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.15]">
              Daily Groceries, Farm Produce & Pure Ceylon Teas
            </h1>

            <p className="text-base text-brand-100 sm:text-lg leading-relaxed">
              Delivering authentic Sri Lankan Keeri Samba rice, organic highland vegetables, and single-origin Ceylon artisan teas straight to your kitchen table.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/products" className="btn-primary btn-lg bg-white text-brand-800 hover:bg-brand-50 shadow-lg">
                Explore Full Catalog <ArrowRight size={18} />
              </Link>
              <a href="#offers-section" className="btn btn-lg border border-white/30 text-white hover:bg-white/10">
                <Tag size={16} /> View Promo Deals
              </a>
            </div>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-[450px] w-[450px] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-amber-400/10 blur-3xl" />
      </section>

      {/* 2. VALUE PROPOSITION BAR */}
      <section className="-mt-8">
        <div className="section-container">
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CATEGORY GRID */}
      <section className="section-container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="badge-brand mb-1">Browse Collections</span>
            <h2 className="page-title">Shop by Category</h2>
          </div>
          <Link to="/products" className="btn-ghost text-sm font-semibold text-brand-600 dark:text-brand-400">
            View All Categories <ArrowRight size={14} />
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[16/10] overflow-hidden rounded-2xl">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
            <AlertCircle className="mx-auto mb-2 text-red-600" size={24} />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Failed to load categories from database.
            </p>
            <button
              onClick={() => refetchCategories()}
              className="btn-secondary btn-sm mt-3"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-2xl border border-slate-200/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800"
              >
                {/* Background Image */}
                <img
                  src={
                    cat.image_url ||
                    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content */}
                <div className="relative z-10 text-white">
                  <h3 className="text-xl font-bold transition group-hover:text-brand-300">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-white/80">{cat.description}</p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition group-hover:translate-x-1">
                    Shop Category <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4. OFFERS / BANNER STRIP */}
      <section id="offers-section" className="section-container">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-brand-700 p-8 text-white shadow-lg">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-center">
            {/* Offer 1 */}
            <div className="space-y-2 border-b border-white/20 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <span className="inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                First Order Discount
              </span>
              <h3 className="text-2xl font-black">10% OFF Storewide</h3>
              <p className="text-xs text-amber-100">
                Min. order Rs. 2,000 (Max discount Rs. 1,000). Apply at checkout.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleCopyCoupon('WELCOME10')}
                  className="btn btn-sm bg-white text-amber-800 hover:bg-amber-50 font-mono font-bold"
                >
                  {copiedCode === 'WELCOME10' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode === 'WELCOME10' ? 'COPIED!' : 'CODE: WELCOME10'}</span>
                </button>
              </div>
            </div>

            {/* Offer 2 */}
            <div className="space-y-2 border-b border-white/20 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <span className="inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                Bulk Grocery Saver
              </span>
              <h3 className="text-2xl font-black">Rs. 500 Flat Savings</h3>
              <p className="text-xs text-amber-100">
                Valid on any order above Rs. 3,500. Perfect for daily staples & rice bags.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleCopyCoupon('WEWALA500')}
                  className="btn btn-sm bg-white text-amber-800 hover:bg-amber-50 font-mono font-bold"
                >
                  {copiedCode === 'WEWALA500' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode === 'WEWALA500' ? 'COPIED!' : 'CODE: WEWALA500'}</span>
                </button>
              </div>
            </div>

            {/* Free Shipping Highlight */}
            <div className="space-y-2">
              <span className="inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                Island Delivery
              </span>
              <h3 className="text-2xl font-black">Free Shipping</h3>
              <p className="text-xs text-amber-100">
                Automatic zero delivery fee applied to your basket on orders over Rs. 5,000.
              </p>
              <div className="pt-2">
                <Link to="/products" className="btn btn-sm bg-brand-900 text-white hover:bg-brand-950 font-bold">
                  Start Filling Basket <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED PRODUCTS */}
      <section className="section-container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="badge-brand mb-1">Store Favorites</span>
            <h2 className="page-title">Featured Products</h2>
          </div>
          <Link to="/products" className="btn-ghost text-sm font-semibold text-brand-600 dark:text-brand-400">
            View All Products <ArrowRight size={14} />
          </Link>
        </div>

        {featuredLoading ? (
          <ProductGridSkeleton count={8} />
        ) : featuredError ? (
          <div className="card p-8 text-center">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Unable to load featured products right now.
            </p>
            <button
              onClick={() => refetchFeatured()}
              className="btn-secondary btn-sm mt-3"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        ) : !featuredProducts || featuredProducts.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">
            <PackageOpen size={48} className="mx-auto mb-3 opacity-40" />
            <p>No featured products found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. NEW ARRIVALS */}
      <section className="section-container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="badge-brand mb-1">Just Added</span>
            <h2 className="page-title">New Harvest & Arrivals</h2>
          </div>
          <Link to="/products?sortBy=newest" className="btn-ghost text-sm font-semibold text-brand-600 dark:text-brand-400">
            See All New <ArrowRight size={14} />
          </Link>
        </div>

        {newArrivalsLoading ? (
          <ProductGridSkeleton count={4} />
        ) : newArrivalsError ? (
          <div className="card p-8 text-center">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Unable to load new arrivals.
            </p>
            <button
              onClick={() => refetchNewArrivals()}
              className="btn-secondary btn-sm mt-3"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        ) : !newArrivals || newArrivals.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">
            <PackageOpen size={48} className="mx-auto mb-3 opacity-40" />
            <p>No new arrivals at this time.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 7. NEWSLETTER BOX */}
      <section className="section-container">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/60 sm:p-12">
          <div className="mx-auto max-w-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
              <Mail size={24} />
            </div>

            <h2 className="text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">
              Stay in the Loop with Fresh Harvests
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Subscribe to get notified about weekly seasonal vegetables, Nuwara Eliya tea batch arrivals, and subscriber-only flash sales.
            </p>

            {newsletterSubscribed ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                <Check size={18} />
                <span>You're subscribed! Check your inbox for your 10% coupon.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="input flex-1 py-3"
                  required
                />
                <button type="submit" className="btn-primary py-3 px-6 shrink-0">
                  Subscribe Now
                </button>
              </form>
            )}

            <p className="text-[11px] text-slate-400">
              We respect your privacy. No spam ever, unsubscribe with one click anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
