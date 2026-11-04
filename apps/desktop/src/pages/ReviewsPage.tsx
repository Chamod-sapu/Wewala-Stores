import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Loader2,
  MessageSquare,
  Clock,
  Eye,
  EyeOff,
  Search,
  X,
  Filter,
  Package,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Review } from '@wewala/shared';
import {
  ProductReviewStatsModal,
  ProductRatingStat,
} from '@/components/reviews/ProductReviewStatsModal';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface ReviewWithDetails extends Review {
  status?: ReviewStatus;
  product?: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    product_images?: { url: string; sort_order: number }[];
  } | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [productStats, setProductStats] = useState<ProductRatingStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection for bulk moderation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModerating, setIsModerating] = useState(false);

  // View Mode: 'table' | 'product_stats'
  const [activeTab, setActiveTab] = useState<'table' | 'product_stats'>('table');

  // Stats Modal
  const [selectedStatModal, setSelectedStatModal] = useState<ProductRatingStat | null>(null);
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);

  // 1. Fetch Reviews & Product Stats
  const fetchReviewsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch reviews with joined product, product_images, and profile
      const { data: revs, error: revError } = await supabase
        .from('reviews')
        .select(
          '*, product:products(id, name, slug, sku, product_images(url, sort_order)), profile:profiles(full_name, avatar_url)'
        )
        .order('created_at', { ascending: false });

      if (revError) throw revError;

      const normalized: ReviewWithDetails[] = (revs || []).map((r: any) => ({
        ...r,
        status: (r.status as ReviewStatus) || (r.is_approved ? 'approved' : 'pending'),
      }));
      setReviews(normalized);

      // 2. Fetch product review stats RPC (with fallback)
      try {
        const { data: statsData, error: statsError } = await supabase.rpc(
          'get_product_review_stats'
        );
        if (!statsError && statsData && Array.isArray(statsData)) {
          setProductStats(statsData as unknown as ProductRatingStat[]);
        } else {
          throw new Error('Fallback to client aggregation');
        }
      } catch {
        // Fallback aggregation by product
        const prodMap: Record<string, ProductRatingStat> = {};
        normalized.forEach((r) => {
          const pid = r.product_id;
          if (!prodMap[pid]) {
            const sortedImgs = [...(r.product?.product_images || [])].sort(
              (a, b) => a.sort_order - b.sort_order
            );
            prodMap[pid] = {
              product_id: pid,
              product_name: r.product?.name || 'Product',
              product_sku: r.product?.sku || null,
              thumbnail_url: sortedImgs[0]?.url || null,
              total_reviews: 0,
              approved_reviews: 0,
              pending_reviews: 0,
              hidden_reviews: 0,
              average_rating: 0,
              count_5_star: 0,
              count_4_star: 0,
              count_3_star: 0,
              count_2_star: 0,
              count_1_star: 0,
            };
          }

          prodMap[pid].total_reviews += 1;
          const st = r.status || (r.is_approved ? 'approved' : 'pending');
          if (st === 'approved') prodMap[pid].approved_reviews += 1;
          else if (st === 'pending') prodMap[pid].pending_reviews += 1;
          else if (st === 'hidden') prodMap[pid].hidden_reviews += 1;

          if (r.rating === 5) prodMap[pid].count_5_star += 1;
          else if (r.rating === 4) prodMap[pid].count_4_star += 1;
          else if (r.rating === 3) prodMap[pid].count_3_star += 1;
          else if (r.rating === 2) prodMap[pid].count_2_star += 1;
          else if (r.rating === 1) prodMap[pid].count_1_star += 1;
        });

        // Compute average ratings
        const statsList = Object.values(prodMap).map((st) => {
          const sum =
            st.count_5_star * 5 +
            st.count_4_star * 4 +
            st.count_3_star * 3 +
            st.count_2_star * 2 +
            st.count_1_star * 1;
          st.average_rating =
            st.total_reviews > 0 ? parseFloat((sum / st.total_reviews).toFixed(2)) : 0;
          return st;
        });

        setProductStats(statsList);
      }
    } catch (err: any) {
      console.warn('Reviews fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewsData();
  }, [fetchReviewsData]);

  // Moderation Handlers
  const handleModerateSingle = async (
    reviewId: string,
    action: 'approve' | 'hide' | 'delete' | 'pending'
  ) => {
    if (
      action === 'delete' &&
      !confirm('Are you sure you want to permanently delete this customer review?')
    ) {
      return;
    }

    try {
      // 1. Try RPC
      const { data, error } = await supabase.rpc('admin_moderate_reviews', {
        p_review_ids: [reviewId],
        p_action: action,
      });

      if (error || !data?.success) {
        // Fallback: direct table operation
        if (action === 'delete') {
          const { error: delErr } = await supabase.from('reviews').delete().eq('id', reviewId);
          if (delErr) throw delErr;
        } else {
          const nextStatus: ReviewStatus =
            action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'pending';
          const isApp = nextStatus === 'approved';

          // Try updating with status first
          const { error: updErr } = await supabase
            .from('reviews')
            .update({
              status: nextStatus,
              is_approved: isApp,
              updated_at: new Date().toISOString(),
            })
            .eq('id', reviewId);

          // If updating with status column fails (e.g. status column does not exist yet), fall back to is_approved
          if (updErr) {
            console.warn('Update with status column failed, falling back to is_approved only:', updErr);
            const { error: fallbackErr } = await supabase
              .from('reviews')
              .update({
                is_approved: isApp,
                updated_at: new Date().toISOString(),
              })
              .eq('id', reviewId);

            if (fallbackErr) throw fallbackErr;
          }
        }
      }

      // Optimistic local update
      if (action === 'delete') {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(reviewId);
          return next;
        });
      } else {
        const nextStatus: ReviewStatus =
          action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'pending';
        const isApp = nextStatus === 'approved';
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, status: nextStatus, is_approved: isApp }
              : r
          )
        );
      }

      // Re-fetch to ensure remote database state and stats stay in sync
      fetchReviewsData();
    } catch (err: any) {
      alert(`Could not moderate review: ${err.message || err}`);
    }
  };

  // Bulk Moderation Handler
  const handleBulkModerate = async (action: 'approve' | 'hide' | 'delete') => {
    if (selectedIds.size === 0) return;
    if (
      action === 'delete' &&
      !confirm(
        `Are you sure you want to permanently delete ${selectedIds.size} selected customer review(s)?`
      )
    ) {
      return;
    }

    setIsModerating(true);
    const ids = Array.from(selectedIds);

    try {
      const { data, error } = await supabase.rpc('admin_moderate_reviews', {
        p_review_ids: ids,
        p_action: action,
      });

      if (error || !data?.success) {
        // Fallback: loop
        for (const id of ids) {
          await handleModerateSingle(id, action);
        }
      } else {
        await fetchReviewsData();
      }

      setSelectedIds(new Set());
    } catch (err: any) {
      alert(`Bulk moderation error: ${err.message || err}`);
    } finally {
      setIsModerating(false);
    }
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts = { all: reviews.length, pending: 0, approved: 0, hidden: 0 };
    reviews.forEach((r) => {
      const st = r.status || (r.is_approved ? 'approved' : 'pending');
      if (st === 'pending') counts.pending += 1;
      else if (st === 'approved') counts.approved += 1;
      else if (st === 'hidden') counts.hidden += 1;
    });
    return counts;
  }, [reviews]);

  // Unique Products with Reviews (for dropdown filter)
  const productsWithReviews = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => {
      if (r.product?.id && r.product?.name) {
        map.set(r.product.id, r.product.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const st = r.status || (r.is_approved ? 'approved' : 'pending');

      // 1. Status Filter
      if (statusFilter !== 'all' && st !== statusFilter) {
        return false;
      }

      // 2. Rating Filter
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) {
        return false;
      }

      // 3. Product Filter
      if (productFilter !== 'all' && r.product_id !== productFilter) {
        return false;
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesComment = r.comment?.toLowerCase().includes(q) || false;
        const matchesCustomer = r.profile?.full_name?.toLowerCase().includes(q) || false;
        const matchesProduct = r.product?.name.toLowerCase().includes(q) || false;
        const matchesSku = r.product?.sku?.toLowerCase().includes(q) || false;

        if (!matchesComment && !matchesCustomer && !matchesProduct && !matchesSku) {
          return false;
        }
      }

      return true;
    });
  }, [reviews, statusFilter, ratingFilter, productFilter, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, ratingFilter, productFilter, search]);

  // Checkbox selection
  const isAllPageSelected =
    paginatedReviews.length > 0 &&
    paginatedReviews.every((r) => selectedIds.has(r.id));
  const isSomePageSelected =
    paginatedReviews.some((r) => selectedIds.has(r.id)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedReviews.forEach((r) => next.delete(r.id));
    } else {
      paginatedReviews.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Customer Reviews Moderation
            </h1>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
              {reviews.length} Total Reviews
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Approve verified buyer testimonials, hide abusive content, and analyze product ratings
          </p>
        </div>

        {/* Tab Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('table')}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare size={13} />
              <span>Reviews Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('product_stats')}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === 'product_stats'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 size={13} />
              <span>Product Rating Stats</span>
            </button>
          </div>

          <button
            onClick={fetchReviewsData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Reviews"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
          </button>
        </div>
      </div>

      {activeTab === 'table' ? (
        <>
          {/* Status Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Reviews', count: statusCounts.all, color: '#6366f1' },
              { id: 'pending', label: 'Pending Approval', count: statusCounts.pending, color: '#f59e0b' },
              { id: 'approved', label: 'Approved (Live)', count: statusCounts.approved, color: '#10b981' },
              { id: 'hidden', label: 'Hidden / Rejected', count: statusCounts.hidden, color: '#64748b' },
            ].map((tab) => {
              const isAct = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
                    isAct
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tab.color }}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isAct
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Toolbar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search comments, customer names, or products..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 pl-9 pr-8 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Rating & Product Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Rating Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  <select
                    value={ratingFilter}
                    onChange={(e) =>
                      setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Star Ratings</option>
                    <option value={5}>5 Stars Only</option>
                    <option value={4}>4 Stars Only</option>
                    <option value={3}>3 Stars Only</option>
                    <option value={2}>2 Stars Only</option>
                    <option value={1}>1 Star Only</option>
                  </select>
                </div>

                {/* Product Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 max-w-[220px]">
                  <Package size={13} className="text-slate-400 shrink-0" />
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer truncate"
                  >
                    <option value="all">All Products</option>
                    {productsWithReviews.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(statusFilter !== 'all' ||
                  ratingFilter !== 'all' ||
                  productFilter !== 'all' ||
                  search) && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setRatingFilter('all');
                      setProductFilter('all');
                      setSearch('');
                    }}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Moderation Banner (Visible when >= 1 review is selected) */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white dark:bg-brand-950 dark:border dark:border-brand-800/60 p-4 shadow-lg animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 font-bold text-xs text-white">
                  {selectedIds.size}
                </span>
                <span className="text-xs font-bold">
                  {selectedIds.size} {selectedIds.size === 1 ? 'review' : 'reviews'} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => handleBulkModerate('approve')}
                  disabled={isModerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-bold text-white transition disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  <span>Bulk Approve</span>
                </button>

                <button
                  onClick={() => handleBulkModerate('hide')}
                  disabled={isModerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 font-bold text-slate-200 transition disabled:opacity-50"
                >
                  <EyeOff size={13} />
                  <span>Bulk Hide</span>
                </button>

                <button
                  onClick={() => handleBulkModerate('delete')}
                  disabled={isModerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-bold text-white transition disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>Bulk Delete</span>
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-xl px-2.5 py-1.5 font-semibold text-slate-400 hover:text-white transition"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Reviews Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
                <p className="mt-3 text-xs text-slate-500 font-semibold">
                  Loading customer reviews...
                </p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  No reviews match your filters
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting the moderation status, rating selection, or search query.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                      {/* Select All */}
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomePageSelected;
                          }}
                          onChange={toggleSelectAllPage}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                        />
                      </th>

                      {/* Product */}
                      <th className="py-3 px-4">Product</th>

                      {/* Rating */}
                      <th className="py-3 px-4">Rating</th>

                      {/* Customer & Comment */}
                      <th className="py-3 px-4">Review & Customer</th>

                      {/* Date */}
                      <th className="py-3 px-4">Date</th>

                      {/* Status */}
                      <th className="py-3 px-4">Status</th>

                      {/* Actions */}
                      <th className="py-3 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedReviews.map((r) => {
                      const isSelected = selectedIds.has(r.id);
                      const st = r.status || (r.is_approved ? 'approved' : 'pending');

                      const sortedImgs = [...(r.product?.product_images || [])].sort(
                        (a, b) => a.sort_order - b.sort_order
                      );
                      const thumb = sortedImgs[0]?.url;

                      return (
                        <tr
                          key={r.id}
                          className={`transition ${
                            isSelected
                              ? 'bg-brand-50/40 dark:bg-brand-950/20'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(r.id)}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                            />
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-[180px]">
                              <div className="h-9 w-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={r.product?.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package size={16} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {r.product?.name || 'Product'}
                                </p>
                                <p className="font-mono text-[10px] text-slate-400">
                                  SKU: {r.product?.sku || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Rating Stars */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={13}
                                    fill={i < r.rating ? 'currentColor' : 'none'}
                                    className={
                                      i < r.rating
                                        ? 'text-amber-400'
                                        : 'text-slate-200 dark:text-slate-700'
                                    }
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {r.rating}.0
                              </span>
                            </div>
                          </td>

                          {/* Review Comment & Customer */}
                          <td className="py-3.5 px-4 max-w-md">
                            <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                              "{r.comment || 'No comment text provided.'}"
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {r.profile?.full_name || 'Customer'}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {st === 'approved' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={11} /> Approved
                              </span>
                            ) : st === 'hidden' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                                <EyeOff size={11} /> Hidden
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </td>

                          {/* Moderation Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Approve */}
                              {st !== 'approved' && (
                                <button
                                  onClick={() => handleModerateSingle(r.id, 'approve')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                                  title="Approve and Publish Review"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Approve</span>
                                </button>
                              )}

                              {/* Hide */}
                              {st !== 'hidden' && (
                                <button
                                  onClick={() => handleModerateSingle(r.id, 'hide')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                                  title="Hide from Storefront"
                                >
                                  <EyeOff size={12} />
                                  <span>Hide</span>
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleModerateSingle(r.id, 'delete')}
                                className="rounded-lg p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Permanently Delete Review"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredReviews.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 p-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, filteredReviews.length)} of{' '}
                    {filteredReviews.length} reviews
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-0.5 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 self-center sm:self-auto">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Product Rating Stats Overview Grid */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-brand-500" /> Catalog Ratings & Satisfaction Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregate score distribution, average star ratings, and feedback volume per product
            </p>
          </div>

          {productStats.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">
              No product reviews have been submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productStats.map((st) => (
                <div
                  key={st.product_id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-500/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                      {st.thumbnail_url ? (
                        <img
                          src={st.thumbnail_url}
                          alt={st.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {st.product_name}
                      </h4>
                      <p className="font-mono text-[10px] text-slate-400">
                        SKU: {st.product_sku || 'N/A'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < Math.round(st.average_rating) ? 'currentColor' : 'none'}
                              className={
                                i < Math.round(st.average_rating)
                                  ? 'text-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }
                            />
                          ))}
                        </div>
                        <span className="font-black text-xs text-slate-900 dark:text-white">
                          {Number(st.average_rating).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({st.total_reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {st.approved_reviews} Approved
                    </span>
                    <span className="text-amber-500 font-bold">
                      {st.pending_reviews} Pending
                    </span>
                    <span className="text-slate-400 font-semibold">
                      {st.hidden_reviews} Hidden
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedStatModal(st);
                        setIsStatModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                    >
                      <BarChart2 size={13} />
                      <span>Breakdown</span>
                    </button>

                    <button
                      onClick={() => {
                        setProductFilter(st.product_id);
                        setActiveTab('table');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-xs font-bold transition"
                    >
                      <MessageSquare size={13} />
                      <span>View Reviews</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Review Stats Deep Dive Modal */}
      <ProductReviewStatsModal
        stats={selectedStatModal}
        isOpen={isStatModalOpen}
        onClose={() => setIsStatModalOpen(false)}
        onFilterByProduct={(pid) => {
          setProductFilter(pid);
          setActiveTab('table');
        }}
      />
    </div>
  );
}
