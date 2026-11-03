import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  MapPin,
  User,
  Phone,
  ChevronRight,
  ShieldCheck,
  Tag,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { STORE_CONFIG, ORDER_STATUSES, OrderStatus } from '@wewala/shared';
import { PrintOrderData } from './OrderInvoicePrint';

const STANDARD_STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'pending', label: 'Pending', description: 'Order submitted' },
  { status: 'paid', label: 'Paid', description: 'Payment confirmed' },
  { status: 'processing', label: 'Processing', description: 'Picking & packing' },
  { status: 'shipped', label: 'Shipped', description: 'Handed to courier' },
  { status: 'delivered', label: 'Delivered', description: 'Received by customer' },
];

interface OrderDetailDrawerProps {
  order: PrintOrderData | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestStatusChange: (targetStatus: OrderStatus) => void;
  onPrintInvoice: (order: PrintOrderData) => void;
  onPrintPackingSlip: (order: PrintOrderData) => void;
  isUpdating?: boolean;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onRequestStatusChange,
  onPrintInvoice,
  onPrintPackingSlip,
  isUpdating = false,
}) => {
  if (!isOpen || !order) return null;

  const currentStatus = order.status;
  const isTerminalStatus = currentStatus === 'cancelled' || currentStatus === 'refunded';
  const currentStepIdx = STANDARD_STEPS.findIndex((s) => s.status === currentStatus);
  const nextStep =
    currentStepIdx >= 0 && currentStepIdx < STANDARD_STEPS.length - 1
      ? STANDARD_STEPS[currentStepIdx + 1]
      : null;

  const statusConfig = ORDER_STATUSES[currentStatus] || { label: currentStatus, color: '#3b82f6' };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize"
                    style={{
                      backgroundColor: `${statusConfig.color}18`,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5 select-all">
                  ID: {order.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPrintInvoice(order)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
                title="Print Official Invoice"
              >
                <Printer size={13} />
                <span>Invoice</span>
              </button>
              <button
                onClick={() => onPrintPackingSlip(order)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
                title="Print Warehouse Packing Slip"
              >
                <FileText size={13} />
                <span>Packing Slip</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Status Stepper Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Fulfillment Lifecycle Stepper
                </h3>
                {nextStep && !isTerminalStatus && (
                  <button
                    onClick={() => onRequestStatusChange(nextStep.status)}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ArrowRight size={12} />
                    )}
                    <span>Advance to {nextStep.label}</span>
                  </button>
                )}
              </div>

              {/* Terminal Banner if cancelled/refunded */}
              {isTerminalStatus ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <RotateCcw size={16} className="shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <p className="font-bold">
                      Order has been {currentStatus === 'cancelled' ? 'Cancelled' : 'Refunded'}
                    </p>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                      All item quantities from this order were automatically restored to warehouse stock and recorded in the inventory audit ledger.
                    </p>
                  </div>
                </div>
              ) : (
                /* Stepper Progression */
                <div className="pt-2">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Bar */}
                    <div className="absolute left-0 top-3.5 h-0.5 w-full bg-slate-200 dark:bg-slate-800 -z-0" />
                    <div
                      className="absolute left-0 top-3.5 h-0.5 bg-brand-500 -z-0 transition-all duration-300"
                      style={{
                        width: `${
                          currentStepIdx >= 0
                            ? (currentStepIdx / (STANDARD_STEPS.length - 1)) * 100
                            : 0
                        }%`,
                      }}
                    />

                    {STANDARD_STEPS.map((step, idx) => {
                      const isPassed = currentStepIdx >= idx;
                      const isCurrent = currentStepIdx === idx;
                      return (
                        <div
                          key={step.status}
                          className="flex flex-col items-center text-center z-10"
                        >
                          <button
                            onClick={() => onRequestStatusChange(step.status)}
                            disabled={isUpdating || isCurrent}
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                              isCurrent
                                ? 'bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-md'
                                : isPassed
                                ? 'bg-emerald-500 text-white hover:opacity-90'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 hover:bg-slate-300'
                            }`}
                            title={`Click to set status: ${step.label}`}
                          >
                            {isPassed && !isCurrent ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              idx + 1
                            )}
                          </button>
                          <span
                            className={`mt-1.5 text-[11px] font-bold ${
                              isCurrent
                                ? 'text-brand-600 dark:text-brand-400'
                                : isPassed
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Jump Controls & Cancel/Refund Options */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">Manual status jump:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['pending', 'paid', 'processing', 'shipped', 'delivered'] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => onRequestStatusChange(st)}
                        disabled={isUpdating || currentStatus === st}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                          currentStatus === st
                            ? 'bg-brand-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}

                  {/* Restock Actions */}
                  {currentStatus !== 'cancelled' && (
                    <button
                      onClick={() => onRequestStatusChange('cancelled')}
                      disabled={isUpdating}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                    >
                      Cancel (Restock)
                    </button>
                  )}
                  {currentStatus !== 'refunded' && (
                    <button
                      onClick={() => onRequestStatusChange('refunded')}
                      disabled={isUpdating}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                    >
                      Refund (Restock)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Customer & Shipping Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User size={14} className="text-brand-500" /> Customer Information
                </h4>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {order.shipping_address?.recipient_name || 'Customer'}
                  </p>
                  {order.shipping_address?.phone && (
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <Phone size={12} /> {order.shipping_address.phone}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Ordered: {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-500" /> Shipping Destination
                </h4>
                <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {order.shipping_address?.street_address}
                  </p>
                  <p>
                    {order.shipping_address?.city}
                    {order.shipping_address?.postal_code
                      ? `, ${order.shipping_address.postal_code}`
                      : ''}
                  </p>
                  <p>{order.shipping_address?.country || 'Sri Lanka'}</p>
                </div>
              </div>
            </div>

            {/* 3. Items Ordered Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package size={14} className="text-brand-500" /> Items List (
                  {order.order_items?.length || 0})
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  Total Items: {order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.order_items?.map((item, idx) => (
                  <div key={item.id || idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-3">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {item.name_snapshot}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span> ×{' '}
                        {STORE_CONFIG.currencySymbol} {Number(item.price_snapshot).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {STORE_CONFIG.currencySymbol}{' '}
                        {(Number(item.price_snapshot) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Payment & Financial Totals */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <CreditCard size={14} className="text-sky-500" /> Payment & Financial Breakdown
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500">Method:</span>
                  <p className="font-bold uppercase text-slate-800 dark:text-slate-200">
                    {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Credit / Debit Card'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Payment Status:</span>
                  <p className="font-bold capitalize text-slate-800 dark:text-slate-200">
                    {order.payment_status}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {STORE_CONFIG.currencySymbol} {Number(order.subtotal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>
                    {order.shipping === 0
                      ? 'FREE'
                      : `${STORE_CONFIG.currencySymbol} ${Number(order.shipping).toLocaleString()}`}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Discount {order.coupon_code ? `(${order.coupon_code})` : ''}
                    </span>
                    <span>
                      -{STORE_CONFIG.currencySymbol} {Number(order.discount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-black text-base text-slate-900 dark:text-white">
                  <span>Total Due</span>
                  <span className="text-brand-600 dark:text-brand-400">
                    {STORE_CONFIG.currencySymbol} {Number(order.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Last updated: {new Date(order.created_at).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPrintInvoice(order)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
              >
                <Printer size={13} /> Print Invoice
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

