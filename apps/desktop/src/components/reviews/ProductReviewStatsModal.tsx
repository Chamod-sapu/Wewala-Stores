import React from 'react';
import { Star, X, CheckCircle2, Clock, EyeOff, Package, MessageSquare } from 'lucide-react';

export interface ProductRatingStat {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  thumbnail_url: string | null;
  total_reviews: number;
  approved_reviews: number;
  pending_reviews: number;
  hidden_reviews: number;
  average_rating: number;
  count_5_star: number;
  count_4_star: number;
  count_3_star: number;
  count_2_star: number;
  count_1_star: number;
}

interface ProductReviewStatsModalProps {
  stats: ProductRatingStat | null;
  isOpen: boolean;
  onClose: () => void;
  onFilterByProduct: (productId: string) => void;
}

export const ProductReviewStatsModal: React.FC<ProductReviewStatsModalProps> = ({
  stats,
  isOpen,
  onClose,
  onFilterByProduct,
}) => {
  if (!isOpen || !stats) return null;

  const total = Math.max(1, stats.total_reviews);
  const starRows = [
    { star: 5, count: stats.count_5_star },
    { star: 4, count: stats.count_4_star },
    { star: 3, count: stats.count_3_star },
    { star: 2, count: stats.count_2_star },
    { star: 1, count: stats.count_1_star },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
              {stats.thumbnail_url ? (
                <img
                  src={stats.thumbnail_url}
                  alt={stats.product_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package size={20} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {stats.product_name}
              </h3>
              <p className="font-mono text-xs text-slate-400">
                SKU: {stats.product_sku || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rating Hero Card */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {Number(stats.average_rating).toFixed(1)}
              </span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    fill={i < Math.round(stats.average_rating) ? 'currentColor' : 'none'}
                    className={
                      i < Math.round(stats.average_rating)
                        ? 'text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Based on {stats.total_reviews} total customer review{stats.total_reviews === 1 ? '' : 's'}
            </p>
          </div>

          {/* Moderation Status Chips */}
          <div className="space-y-1 text-right text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold block">
              <CheckCircle2 size={12} /> {stats.approved_reviews} Approved
            </span>
            <span className="inline-flex items-center gap-1 text-amber-500 font-bold block">
              <Clock size={12} /> {stats.pending_reviews} Pending
            </span>
            {stats.hidden_reviews > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-400 font-bold block">
                <EyeOff size={12} /> {stats.hidden_reviews} Hidden
              </span>
            )}
          </div>
        </div>

        {/* Star Distribution Progress Bars */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
            Rating Distribution
          </h4>
          <div className="space-y-2">
            {starRows.map(({ star, count }) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 text-slate-600 dark:text-slate-400 font-bold">
                    <span>{star}</span>
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-slate-400">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              onFilterByProduct(stats.product_id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 hover:bg-brand-100 px-3.5 py-2 text-xs font-bold transition"
          >
            <MessageSquare size={13} />
            <span>Filter Reviews by this Product</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

