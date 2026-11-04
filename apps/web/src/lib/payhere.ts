import { generatePayHereHash, STORE_CONFIG } from '@wewala/shared';

declare global {
  interface Window {
    payhere?: {
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
      startPayment: (paymentObject: Record<string, any>) => void;
    };
  }
}

/**
 * Loads PayHere's official JavaScript SDK dynamically
 */
export function loadPayHereSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.payhere) return resolve();

    const existing = document.getElementById('payhere-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load PayHere SDK')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'payhere-sdk';
    script.src = 'https://www.payhere.lk/lib/payhere.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayHere payment engine.'));
    document.body.appendChild(script);
  });
}

export interface PayHereCustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
}

export interface LaunchPayHereOptions {
  orderId: string;
  amount: number;
  itemsDescription?: string;
  customer: PayHereCustomerInfo;
  onCompleted: (orderId: string) => void;
  onDismissed: () => void;
  onError: (error: string) => void;
}

/**
 * Launches official PayHere payment popup for live bank card debiting
 */
export async function launchPayHerePayment(options: LaunchPayHereOptions): Promise<void> {
  await loadPayHereSDK();

  if (!window.payhere) {
    throw new Error('PayHere payment gateway engine could not be initialized.');
  }

  const merchantId = import.meta.env.VITE_PAYHERE_MERCHANT_ID || '1211149';
  const merchantSecret = import.meta.env.VITE_PAYHERE_SECRET || 'sandbox_secret';
  // If VITE_PAYHERE_SANDBOX is explicitly 'false', it runs in LIVE real-money mode!
  const isSandbox = import.meta.env.VITE_PAYHERE_SANDBOX !== 'false';

  const formattedAmount = Number(options.amount).toFixed(2);
  const hash = generatePayHereHash(
    merchantId,
    options.orderId,
    options.amount,
    'LKR',
    merchantSecret
  );

  const reqOrigin = window.location.origin;

  const paymentData = {
    sandbox: isSandbox,
    merchant_id: merchantId,
    return_url: `${reqOrigin}/order-success?orderId=${options.orderId}&payment=paid`,
    cancel_url: `${reqOrigin}/orders/${options.orderId}?payment=cancelled`,
    notify_url: `${reqOrigin}/api/payhere-notify`,
    order_id: options.orderId,
    items: options.itemsDescription || `${STORE_CONFIG.name} Order #${options.orderId.slice(0, 8)}`,
    amount: formattedAmount,
    currency: 'LKR',
    hash: hash,
    first_name: options.customer.firstName || 'Customer',
    last_name: options.customer.lastName || 'Valued',
    email: options.customer.email || 'customer@wewala.com',
    phone: options.customer.phone || '0770000000',
    address: options.customer.address || 'Delivery Address',
    city: options.customer.city || 'Colombo',
    country: options.customer.country || 'Sri Lanka',
  };

  // Attach callbacks
  window.payhere.onCompleted = (orderId: string) => {
    options.onCompleted(orderId);
  };

  window.payhere.onDismissed = () => {
    options.onDismissed();
  };

  window.payhere.onError = (error: string) => {
    options.onError(error);
  };

  // Launch official popup
  window.payhere.startPayment(paymentData);
}

