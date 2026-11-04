import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { STORE_CONFIG, CardBrand } from '@wewala/shared';

interface ThreeDSecureModalProps {
  isOpen: boolean;
  amount: number;
  brand: CardBrand;
  last4: string;
  onAuthorize: () => Promise<void>;
  onCancel: () => void;
}

export const ThreeDSecureModal: React.FC<ThreeDSecureModalProps> = ({
  isOpen,
  amount,
  brand,
  last4,
  onAuthorize,
  onCancel,
}) => {
  const [otp, setOtp] = useState('123456');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(180);

  useEffect(() => {
    if (!isOpen) {
      setOtp('123456');
      setIsProcessing(false);
      setErrorMsg(null);
      setSecondsLeft(180);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Simulate banking network roundtrip (800ms)
      await new Promise((r) => setTimeout(r, 800));
      await onAuthorize();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment authorization failed.');
      setIsProcessing(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerDisplay = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Bank & Card Security Header */}
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  3D Secure 2.0 Verification
                </h3>
                <p className="text-xs text-slate-500">
                  {brand.toUpperCase()} Identity Check • Bank Portal
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {timerDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Merchant</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {STORE_CONFIG.name} (Pvt) Ltd
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount to Pay</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {STORE_CONFIG.currencySymbol} {amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Card Reference</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {brand.toUpperCase()} •••• {last4}
            </span>
          </div>
        </div>

        {/* OTP Input Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SMS One-Time Password (OTP) *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Enter the 6-digit authentication passcode sent to your phone.
            </p>
            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                disabled={isProcessing}
                className="input w-full text-center font-mono text-2xl font-black tracking-[0.5em] py-2.5"
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-medium">Demo mode prefilled: 123456</span>
              <button
                type="button"
                onClick={() => setOtp('123456')}
                className="text-brand-600 hover:underline font-semibold"
              >
                Reset Code
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onCancel}
              className="btn-ghost flex-1 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !otp}
              className="btn-primary flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Authorizing...
                </>
              ) : (
                <>
                  <Lock size={14} /> Authorize Payment
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-slate-400">
          Protected by Central Bank of Sri Lanka 3D Secure Guidelines & EMVCo
        </p>
      </div>
    </div>
  );
};
