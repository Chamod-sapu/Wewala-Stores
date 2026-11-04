import React from 'react';
import {
  CreditCard,
  Lock,
  Calendar,
  User,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CardBrand,
  DEMO_TEST_CARDS,
  detectCardBrand,
  formatCardNumber,
  formatExpiryDate,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
} from '@wewala/shared';
import { CardVisualizer } from './CardVisualizer';

export interface CardFormData {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  brand: CardBrand;
  saveCard?: boolean;
}

interface CardPaymentFormProps {
  cardData: CardFormData;
  onChange: (data: CardFormData) => void;
  errors?: Record<string, string>;
  amount?: number;
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  cardData,
  onChange,
  errors = {},
}) => {
  const { cardNumber, cardHolder, expiry, cvv, brand, saveCard } = cardData;

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCardNumber(raw);
    const detected = detectCardBrand(formatted);
    onChange({
      ...cardData,
      cardNumber: formatted,
      brand: detected,
    });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    onChange({
      ...cardData,
      expiry: formatted,
    });
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const maxLen = brand === 'amex' ? 4 : 3;
    onChange({
      ...cardData,
      cvv: raw.slice(0, maxLen),
    });
  };

  const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...cardData,
      cardHolder: e.target.value,
    });
  };

  const handleApplyDemoCard = (demo: (typeof DEMO_TEST_CARDS)[0]) => {
    onChange({
      cardNumber: demo.number,
      cardHolder: demo.holder,
      expiry: demo.expiry,
      cvv: demo.cvv,
      brand: demo.brand,
      saveCard: false,
    });
  };

  // Real-time validation badges
  const numValidation = validateCardNumber(cardNumber);
  const expiryValidation = validateExpiryDate(expiry);
  const cvvValidation = validateCVV(cvv, brand);

  return (
    <div className="space-y-6">
      {/* 1. Interactive Visualizer */}
      <div className="pt-1 pb-2">
        <CardVisualizer
          cardNumber={cardNumber}
          cardHolder={cardHolder}
          expiry={expiry}
          brand={brand}
        />
      </div>

      {/* 2. Demo Test Cards Quick Bar */}
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-3.5 dark:border-brand-900/40 dark:bg-brand-950/20">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 mb-2">
          <Sparkles size={14} className="text-brand-600 animate-pulse" />
          <span>Instant Demo / Sandbox Cards</span>
          <span className="text-[10px] font-normal text-slate-500">(Click to auto-fill)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_TEST_CARDS.map((demo) => {
            const isSelected = cardNumber.replace(/\s/g, '') === demo.number.replace(/\s/g, '');
            return (
              <button
                key={demo.brand}
                type="button"
                onClick={() => handleApplyDemoCard(demo)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {isSelected && <Check size={12} />}
                {demo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Card Input Fields */}
      <div className="space-y-4">
        {/* Card Number */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Card Number *
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="4242 •••• •••• ••••"
              value={cardNumber}
              onChange={handleNumberChange}
              maxLength={brand === 'amex' ? 17 : 19}
              className={`input w-full pl-10 pr-24 font-mono font-bold tracking-wider ${
                errors.cardNumber ? 'border-rose-500 focus:ring-rose-500' : ''
              }`}
            />
            <CreditCard
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            {/* Brand indicator pill */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {brand !== 'unknown' && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {brand}
                </span>
              )}
              {numValidation.isValid && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={12} />
                </span>
              )}
            </div>
          </div>
          {errors.cardNumber && (
            <p className="mt-1 text-xs text-rose-500">{errors.cardNumber}</p>
          )}
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Cardholder Name *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Kasun Perera"
              value={cardHolder}
              onChange={handleHolderChange}
              className={`input w-full pl-10 uppercase tracking-wide font-medium ${
                errors.cardHolder ? 'border-rose-500 focus:ring-rose-500' : ''
              }`}
            />
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          {errors.cardHolder && (
            <p className="mt-1 text-xs text-rose-500">{errors.cardHolder}</p>
          )}
        </div>

        {/* Expiry & CVV Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Expiry Date *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={handleExpiryChange}
                maxLength={5}
                className={`input w-full pl-10 font-mono font-bold tracking-wider ${
                  errors.expiry ? 'border-rose-500 focus:ring-rose-500' : ''
                }`}
              />
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              {expiryValidation.isValid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={12} />
                </span>
              )}
            </div>
            {errors.expiry && <p className="mt-1 text-xs text-rose-500">{errors.expiry}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Security Code (CVV) *
              </label>
              <span className="text-[10px] text-slate-400">
                {brand === 'amex' ? '4 digits' : '3 digits'}
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                placeholder={brand === 'amex' ? '••••' : '•••'}
                value={cvv}
                onChange={handleCvvChange}
                maxLength={brand === 'amex' ? 4 : 3}
                className={`input w-full pl-10 font-mono font-bold tracking-widest ${
                  errors.cvv ? 'border-rose-500 focus:ring-rose-500' : ''
                }`}
              />
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              {cvvValidation.isValid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={12} />
                </span>
              )}
            </div>
            {errors.cvv && <p className="mt-1 text-xs text-rose-500">{errors.cvv}</p>}
          </div>
        </div>

        {/* Save Card Checkbox */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
            <input
              type="checkbox"
              checked={saveCard || false}
              onChange={(e) => onChange({ ...cardData, saveCard: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
            />
            <span>Save card securely for 1-click checkout next time</span>
          </label>
        </div>
      </div>

      {/* 4. Security Footnote */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
        <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          <strong>Bank-Grade 256-Bit SSL Encryption:</strong> Your card data is protected with
          end-to-end tokenization and 3D Secure 2.0 authentication.
        </span>
      </div>
    </div>
  );
};

