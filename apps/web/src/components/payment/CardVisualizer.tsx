import React from 'react';
import { Wifi } from 'lucide-react';
import { CardBrand } from '@wewala/shared';

interface CardVisualizerProps {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  brand: CardBrand;
}

export const CardVisualizer: React.FC<CardVisualizerProps> = ({
  cardNumber,
  cardHolder,
  expiry,
  brand,
}) => {
  // Format card number with fallback placeholders
  const displayCardNumber = () => {
    const raw = cardNumber.replace(/\D/g, '');
    if (!raw) return '•••• •••• •••• ••••';

    if (brand === 'amex') {
      const p1 = raw.slice(0, 4);
      const p2 = raw.slice(4, 10);
      const p3 = raw.slice(10, 15);
      return [p1, p2, p3].filter(Boolean).join(' ');
    }

    const groups = raw.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  // Render brand logo
  const renderBrandLogo = () => {
    switch (brand) {
      case 'visa':
        return (
          <div className="flex flex-col items-end">
            <span className="font-serif italic font-extrabold text-2xl tracking-wider text-blue-200">
              VISA
            </span>
          </div>
        );
      case 'mastercard':
        return (
          <div className="flex items-center -space-x-2.5">
            <div className="h-7 w-7 rounded-full bg-rose-500/90 shadow-sm" />
            <div className="h-7 w-7 rounded-full bg-amber-400/90 shadow-sm" />
          </div>
        );
      case 'amex':
        return (
          <span className="font-mono font-black text-xs px-2 py-1 bg-cyan-400/20 text-cyan-200 rounded border border-cyan-400/40 tracking-wider">
            AMEX
          </span>
        );
      case 'discover':
        return (
          <span className="font-sans font-black text-sm text-orange-300 tracking-wider">
            DISCOVER
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] text-slate-300 uppercase tracking-widest px-2 py-0.5 rounded bg-white/10">
            DEBIT / CREDIT
          </span>
        );
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[1.586/1] rounded-2xl p-5 text-white shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900 to-brand-950 border border-white/15">
      {/* Decorative background glow circles */}
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand-500/15 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      {/* Top Row: Chip, Wifi & Brand Logo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Gold Chip Graphic */}
          <div className="relative h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-md p-1 flex flex-col justify-between overflow-hidden border border-amber-300/60">
            <div className="h-full w-full border border-amber-800/20 rounded-sm flex items-center justify-center">
              <div className="h-2 w-3 rounded-[1px] border border-amber-900/40" />
            </div>
          </div>
          {/* Contactless Wifi Icon */}
          <Wifi size={18} className="text-white/60 rotate-90" />
        </div>

        <div>{renderBrandLogo()}</div>
      </div>

      {/* Middle: Card Number */}
      <div className="mt-6 mb-4">
        <div className="font-mono text-lg sm:text-xl font-bold tracking-[0.18em] text-white/95 drop-shadow-sm truncate">
          {displayCardNumber()}
        </div>
      </div>

      {/* Bottom Row: Holder Name & Expiry */}
      <div className="flex items-end justify-between mt-auto pt-2">
        <div className="max-w-[70%]">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
            Cardholder
          </div>
          <div className="font-mono text-xs sm:text-sm font-semibold uppercase tracking-wider text-white truncate">
            {cardHolder.trim() || 'Valued Customer'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
            Expires
          </div>
          <div className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white">
            {expiry || 'MM/YY'}
          </div>
        </div>
      </div>
    </div>
  );
};

