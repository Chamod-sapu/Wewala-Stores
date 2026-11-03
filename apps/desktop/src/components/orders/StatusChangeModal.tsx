import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, X, Loader2 } from 'lucide-react';
import { ORDER_STATUSES, OrderStatus } from '@wewala/shared';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  targetStatus: OrderStatus;
  currentStatus: OrderStatus;
  orderRef?: string;
  itemCount?: number;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetStatus,
  currentStatus,
  orderRef,
  itemCount = 1,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isRestockAction = targetStatus === 'cancelled' || targetStatus === 'refunded';
  const targetConfig = ORDER_STATUSES[targetStatus] || { label: targetStatus, color: '#3b82f6' };
  const currentConfig = ORDER_STATUSES[currentStatus] || { label: currentStatus, color: '#94a3b8' };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            {isRestockAction ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle size={18} />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <RotateCcw size={18} />
              </div>
            )}
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isRestockAction ? 'Confirm Order ' + targetConfig.label : 'Update Order Status'}
              </h3>
              {orderRef && (
                <p className="text-xs text-slate-500 font-mono">Ref: {orderRef}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transition Badge Pill */}
        <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs">
          <span
            className="rounded-lg px-2.5 py-1 font-bold capitalize"
            style={{ backgroundColor: `${currentConfig.color}20`, color: currentConfig.color }}
          >
            {currentConfig.label}
          </span>
          <span className="text-slate-400 font-bold">➔</span>
          <span
            className="rounded-lg px-2.5 py-1 font-bold capitalize"
            style={{ backgroundColor: `${targetConfig.color}20`, color: targetConfig.color }}
          >
            {targetConfig.label}
          </span>
        </div>

        {/* Restock Warning Banner for Cancellation / Refund */}
        {isRestockAction ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
            <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <RotateCcw size={14} /> Automatic Inventory Restock
            </p>
            <p className="leading-relaxed">
              Moving this order to <strong className="uppercase">{targetConfig.label}</strong> will
              automatically return the item quantities ({itemCount} item line{itemCount === 1 ? '' : 's'}) back to active stock in the warehouse and record an audit log in{' '}
              <code className="text-rose-600 dark:text-rose-400 font-mono">inventory_movements</code>.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to transition this order to{' '}
            <strong className="text-slate-900 dark:text-white capitalize">{targetConfig.label}</strong>?
          </p>
        )}

        {/* Reason Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reason / Operational Note {isRestockAction ? '(Recommended)' : '(Optional)'}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isRestockAction
                ? 'e.g., Customer requested cancellation / damaged goods'
                : 'e.g., Package dispatched via DHL Express'
            }
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs placeholder-slate-400 transition focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
              isRestockAction
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Confirm Transition
          </button>
        </div>
      </div>
    </div>
  );
};

