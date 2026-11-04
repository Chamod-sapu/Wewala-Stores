export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export interface CardValidationResult {
  isValid: boolean;
  brand: CardBrand;
  message?: string;
}

export interface ExpiryValidationResult {
  isValid: boolean;
  message?: string;
}

export interface CVVValidationResult {
  isValid: boolean;
  message?: string;
}

export interface DemoCard {
  label: string;
  brand: CardBrand;
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
}

export const DEMO_TEST_CARDS: DemoCard[] = [
  {
    label: 'Visa Test Card',
    brand: 'visa',
    number: '4242 4242 4242 4242',
    expiry: '12/28',
    cvv: '888',
    holder: 'Kasun Perera',
  },
  {
    label: 'Mastercard Test',
    brand: 'mastercard',
    number: '5555 5555 5555 4444',
    expiry: '09/29',
    cvv: '777',
    holder: 'Nimal Jayawardena',
  },
  {
    label: 'Amex Test Card',
    brand: 'amex',
    number: '3782 822463 10005',
    expiry: '11/27',
    cvv: '1234',
    holder: 'Dilshan Silva',
  },
];

/**
 * Detects the card brand based on card number prefix (BIN)
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, '');

  if (/^4/.test(clean)) {
    return 'visa';
  }
  if (/^(5[1-5]|2[2-7])/.test(clean)) {
    return 'mastercard';
  }
  if (/^3[47]/.test(clean)) {
    return 'amex';
  }
  if (/^(6011|65|64[4-9]|622)/.test(clean)) {
    return 'discover';
  }

  return 'unknown';
}

/**
 * Formats a card number string with visual spacing based on brand
 */
export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '');
  const brand = detectCardBrand(clean);

  if (brand === 'amex') {
    // Amex format: 4-6-5 digits (max 15)
    const limited = clean.slice(0, 15);
    const parts = [limited.slice(0, 4), limited.slice(4, 10), limited.slice(10, 15)].filter(
      Boolean
    );
    return parts.join(' ');
  }

  // Standard format: 4-4-4-4 digits (max 16)
  const limited = clean.slice(0, 16);
  const parts = limited.match(/.{1,4}/g);
  return parts ? parts.join(' ') : limited;
}

/**
 * Formats expiry input into MM/YY
 */
export function formatExpiryDate(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

/**
 * Luhn checksum algorithm implementation for card number verification
 */
export function luhnCheck(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '');
  if (!clean || clean.length < 13) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Validates a credit/debit card number
 */
export function validateCardNumber(cardNumber: string): CardValidationResult {
  const clean = cardNumber.replace(/\D/g, '');
  const brand = detectCardBrand(clean);

  if (!clean) {
    return { isValid: false, brand: 'unknown', message: 'Card number is required' };
  }

  const expectedLength = brand === 'amex' ? 15 : 16;
  if (clean.length !== expectedLength) {
    return {
      isValid: false,
      brand,
      message: `Card number must be ${expectedLength} digits (current: ${clean.length})`,
    };
  }

  if (!luhnCheck(clean)) {
    return { isValid: false, brand, message: 'Invalid card checksum. Please check card number.' };
  }

  return { isValid: true, brand };
}

/**
 * Validates card expiry MM/YY
 */
export function validateExpiryDate(expiry: string): ExpiryValidationResult {
  const clean = expiry.replace(/\D/g, '');
  if (clean.length < 4) {
    return { isValid: false, message: 'Expiry date must be in MM/YY format' };
  }

  const month = parseInt(clean.slice(0, 2), 10);
  const year = parseInt(`20${clean.slice(2, 4)}`, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, message: 'Invalid month (01 - 12)' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { isValid: false, message: 'Card has expired' };
  }

  if (year > currentYear + 20) {
    return { isValid: false, message: 'Invalid expiry year' };
  }

  return { isValid: true };
}

/**
 * Validates card CVV/CVC code
 */
export function validateCVV(cvv: string, brand: CardBrand = 'unknown'): CVVValidationResult {
  const clean = cvv.replace(/\D/g, '');
  const requiredLength = brand === 'amex' ? 4 : 3;

  if (clean.length !== requiredLength) {
    return {
      isValid: false,
      message: `Security code (CVV) must be ${requiredLength} digits`,
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique transaction identifier
 */
export function generateTransactionId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `TXN-WW-${time}${rand}`;
}

