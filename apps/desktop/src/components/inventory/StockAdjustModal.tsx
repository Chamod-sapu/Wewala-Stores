import React, { useState, useEffect } from 'react';
import { Plus, Minus, RotateCcw, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Product } from '@wewala/shared';

interface StockAdjustModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAdminAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState<string>('Supplier Stock Delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setQuantity(adjustmentType === 'set' ? product.stock : 5);
      setErrorMsg(null);
    }
  }, [product, adjustmentType]);

  if (!isOpen || !product) return null;

  const currentStock = product.stock;
  let delta = 0;
  let resultingStock = currentStock;

  if (adjustmentType === 'add') {
    delta = Math.max(0, quantity);
    resultingStock = currentStock + delta;
  } else if (adjustmentType === 'subtract') {
    delta = -Math.max(0, quantity);
    resultingStock = Math.max(0, currentStock + delta);
  } else {
    // set absolute
    resultingStock = Math.max(0, quantity);
    delta = resultingStock - currentStock;
  }

  const quickReasons =
    adjustmentType === 'add'
      ? ['Supplier Stock Delivery', 'Physical Inventory Count (+)', 'Customer Return Restock', 'Warehouse Transfer In']
      : adjustmentType === 'subtract'
      ? ['Damaged / Expired Goods', 'Loss / Shrinkage', 'Physical Inventory Count (-)', 'Promotional Sample']
      : ['Full Stocktake Audit', 'Stock Calibration'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) {
      setErrorMsg('Stock adjustment results in zero change.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please specify a reason for this inventory movement.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update product stock
      const { error: prodErr } = await supabase
        .from('products')
        .update({
          stock: resultingStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (prodErr) throw prodErr;

      // 2. Write to inventory_movements
      const { error: moveErr } = await supabase.from('inventory_movements').insert({
        product_id: product.id,
        change: delta,
        reason: reason.trim(),
        created_by: user?.id || null,
      });

      if (moveErr) throw moveErr;

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-brand-500" /> Adjust Inventory Stock
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs font-medium">
              {product.name} ({product.sku || 'No SKU'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 font-bold">
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('add');
                setReason('Supplier Stock Delivery');
              }}
              className={`rounded-lg py-1.5 transition flex items-center justify-center gap-1 ${
                adjustmentType === 'add'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus size={13} /> Add Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('subtract');
                setReason('Damaged / Expired Goods');
              }}
              className={`rounded-lg py-1.5 transition flex items-center justify-center gap-1 ${
                adjustmentType === 'subtract'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Minus size={13} /> Reduce
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('set');
                setReason('Full Stocktake Audit');
              }}
              className={`rounded-lg py-1.5 transition flex items-center justify-center gap-1 ${
                adjustmentType === 'set'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Set Count
            </button>
          </div>

          {/* Quantity Input & Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {adjustmentType === 'add'
                  ? 'Units to Add:'
                  : adjustmentType === 'subtract'
                  ? 'Units to Remove:'
                  : 'New Total Quantity:'}
              </label>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-right font-black text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Visual Stock Transition Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">CURRENT STOCK</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {currentStock} units
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block text-[10px]">DELTA</span>
                <span
                  className={`font-black text-sm ${
                    delta > 0
                      ? 'text-emerald-600'
                      : delta < 0
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">NEW STOCK</span>
                <span className="font-black text-brand-600 dark:text-brand-400 text-sm">
                  {resultingStock} units
                </span>
              </div>
            </div>
          </div>

          {/* Reason Input & Quick Chips */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Adjustment Reason (Audit Log)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for inventory ledger..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickReasons.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold border transition ${
                    reason === r
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              Save Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

