import React, { useState, useEffect, useCallback } from 'react';
import { History, X, Search, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@wewala/shared';

interface InventoryMovementRecord {
  id: string;
  product_id: string;
  change: number;
  reason: string;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
  products?: {
    name: string;
    sku: string | null;
  } | null;
}

interface MovementHistoryModalProps {
  product: Product | null; // If null, displays storewide movements
  isOpen: boolean;
  onClose: () => void;
}

export const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*, products(name, sku)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (product) {
        query = query.eq('product_id', product.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements((data as unknown as InventoryMovementRecord[]) || []);
    } catch (err) {
      console.warn('Error fetching inventory movements:', err);
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      fetchMovements();
    }
  }, [isOpen, fetchMovements]);

  if (!isOpen) return null;

  const filteredMovements = movements.filter((m) => {
    const q = search.toLowerCase();
    const prodName = m.products?.name?.toLowerCase() || '';
    const sku = m.products?.sku?.toLowerCase() || '';
    const reason = m.reason?.toLowerCase() || '';
    const orderRef = m.order_id?.toLowerCase() || '';
    return prodName.includes(q) || sku.includes(q) || reason.includes(q) || orderRef.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <History size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Inventory Movement Audit Ledger
              </h3>
              <p className="text-xs text-slate-500">
                {product ? `Audit history for "${product.name}"` : 'Storewide real-time stock intake, orders, and restocks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMovements}
              disabled={loading}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="Refresh ledger"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search movement reason, product name, or order ID..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 pl-8 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
              <p className="mt-2 text-xs text-slate-500">Loading audit history...</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No inventory movements recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-4">Date & Time</th>
                  {!product && <th className="py-2.5 px-4">Product</th>}
                  <th className="py-2.5 px-4 text-center">Change</th>
                  <th className="py-2.5 px-4">Reason / Notes</th>
                  <th className="py-2.5 px-4">Order Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMovements.map((m) => {
                  const isPositive = m.change > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {!product && (
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          <p className="truncate max-w-[180px]">{m.products?.name || 'Product'}</p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {m.products?.sku || 'No SKU'}
                          </p>
                        </td>
                      )}

                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-black text-xs ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {isPositive ? `+${m.change}` : m.change}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {m.reason}
                      </td>

                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                        {m.order_id ? (
                          <span className="text-brand-600 dark:text-brand-400 font-bold">
                            #{m.order_id.slice(0, 8).toUpperCase()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400">
            {filteredMovements.length} logged record{filteredMovements.length === 1 ? '' : 's'}
          </span>
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

