import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PackageOpen,
  Filter,
  ArrowUpDown,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/SkeletonLoader';
import { SEO } from '@/components/common/SEO';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import { STORE_CONFIG } from '@wewala/shared';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Alphabetical: A to Z' },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialSort = (searchParams.get('sortBy') as any) || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const initialMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

  // Local Filter Controls
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchInput, 400);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name-asc'>(initialSort);
  const [page, setPage] = useState(initialPage);

  const [minPriceInput, setMinPriceInput] = useState<string>(initialMinPrice ? String(initialMinPrice) : '');
  const [maxPriceInput, setMaxPriceInput] = useState<string>(initialMaxPrice ? String(initialMaxPrice) : '');

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync debounced search and filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy && sortBy !== 'newest') params.set('sortBy', sortBy);
    if (minPriceInput) params.set('minPrice', minPriceInput);
    if (maxPriceInput) params.set('maxPrice', maxPriceInput);
    if (page > 1) params.set('page', String(page));

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedCategory, sortBy, minPriceInput, maxPriceInput, page, setSearchParams]);

  // When search or filter changes, reset to page 1
  const handleCategoryChange = (catSlug: string) => {
    setSelectedCategory(catSlug);
    setPage(1);
  };

  const handleSortChange = (newSort: any) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedCategory('all');
    setSortBy('newest');
    setMinPriceInput('');
    setMaxPriceInput('');
    setPage(1);
  };

  // Queries
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
    isFetching,
  } = useProducts({
    search: debouncedSearch,
    categorySlug: selectedCategory,
    minPrice: minPriceInput ? Number(minPriceInput) : undefined,
    maxPrice: maxPriceInput ? Number(maxPriceInput) : undefined,
    sortBy,
    page,
    pageSize: 8,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = productsData?.totalPages || 1;

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    selectedCategory !== 'all' ||
    minPriceInput !== '' ||
    maxPriceInput !== '' ||
    sortBy !== 'newest';

  return (
    <div className="section-container py-10 space-y-8">
      <SEO
        title="Store Catalog & Fresh Groceries"
        description="Browse all products at Wewala Stores: Ceylon teas, heirloom rice, cold-pressed oils, and fresh produce."
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="page-title">Store Catalog</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {totalCount > 0 ? (
              <>
                Showing {(page - 1) * 8 + 1}–{Math.min(page * 8, totalCount)} of {totalCount} verified products
              </>
            ) : (
              'Explore fresh groceries, daily staples, and Ceylon teas'
            )}
          </p>
        </div>

        {/* Mobile Filter Toggle & Quick Sort */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="btn btn-secondary sm:hidden flex items-center gap-2"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-brand-600" />
            )}
          </button>

          <div className="relative flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="input py-2 text-xs font-semibold sm:w-48"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Sidebar Filters + Products Grid) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* SIDEBAR FILTERS (Desktop) */}
        <aside
          className={`space-y-6 ${
            isMobileFilterOpen
              ? 'fixed inset-0 z-50 overflow-y-auto bg-white p-6 dark:bg-slate-900 lg:static lg:p-0'
              : 'hidden lg:block'
          }`}
        >
          {/* Mobile Close Button */}
          {isMobileFilterOpen && (
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 lg:hidden">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Filter size={18} /> Filters
              </h2>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-ghost p-1.5"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Search Products
            </h3>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search rice, tea, oil, dhal..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="input pl-9 text-xs"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Categories</span>
                {selectedCategory === 'all' && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
              </button>

              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === cat.slug
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {selectedCategory === cat.slug && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Price Range ({STORE_CONFIG.currencySymbol})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Min (Rs.)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minPriceInput}
                  onChange={(e) => {
                    setMinPriceInput(e.target.value);
                    setPage(1);
                  }}
                  className="input text-xs py-1.5 px-2"
                  min="0"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Max (Rs.)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={maxPriceInput}
                  onChange={(e) => {
                    setMaxPriceInput(e.target.value);
                    setPage(1);
                  }}
                  className="input text-xs py-1.5 px-2"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary w-full text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              <RotateCcw size={14} /> Reset All Filters
            </button>
          )}

          {isMobileFilterOpen && (
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="btn-primary w-full text-sm font-bold lg:hidden mt-4"
            >
              View Results ({totalCount})
            </button>
          )}
        </aside>

        {/* PRODUCTS CONTENT COLUMN */}
        <main className="lg:col-span-3 space-y-6">
          {/* Active Filter Pills Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Active Filters:</span>

              {debouncedSearch && (
                <span className="badge-neutral flex items-center gap-1.5">
                  Search: "{debouncedSearch}"
                  <button onClick={() => setSearchInput('')}>
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="badge-brand flex items-center gap-1.5">
                  Category: {categories?.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => handleCategoryChange('all')}>
                    <X size={12} />
                  </button>
                </span>
              )}

              {(minPriceInput || maxPriceInput) && (
                <span className="badge-neutral flex items-center gap-1.5">
                  Price: Rs. {minPriceInput || '0'} – Rs. {maxPriceInput || 'Any'}
                  <button
                    onClick={() => {
                      setMinPriceInput('');
                      setMaxPriceInput('');
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400 font-semibold ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Loading Indicator when fetching next page */}
          {isFetching && !productsLoading && (
            <div className="flex items-center gap-2 text-xs text-brand-600">
              <RefreshCw size={12} className="animate-spin" />
              <span>Updating results...</span>
            </div>
          )}

          {/* Products Grid State Handling */}
          {productsLoading ? (
            <ProductGridSkeleton count={8} />
          ) : productsError ? (
            <div className="card p-12 text-center space-y-3">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Unable to load products
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                An error occurred while fetching catalog items from Supabase.
              </p>
              <button onClick={() => refetchProducts()} className="btn-secondary btn-sm mt-2">
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="card p-16 text-center space-y-4">
              <PackageOpen size={48} className="mx-auto text-slate-400 opacity-50" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No products match your criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try clearing your search term, adjusting your price range, or selecting another category.
              </p>
              <button onClick={handleResetFilters} className="btn-primary btn-sm mt-2">
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalCount} items)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-secondary btn-sm px-2.5 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                      page === pageNum
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-secondary btn-sm px-2.5 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
