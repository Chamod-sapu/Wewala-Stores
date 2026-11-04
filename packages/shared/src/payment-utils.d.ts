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
export declare const DEMO_TEST_CARDS: DemoCard[];
/**
 * Detects the card brand based on card number prefix (BIN)
 */
export declare function detectCardBrand(cardNumber: string): CardBrand;
/**
 * Formats a card number string with visual spacing based on brand
 */
export declare function formatCardNumber(value: string): string;
/**
 * Formats expiry input into MM/YY
 */
export declare function formatExpiryDate(value: string): string;
/**
 * Luhn checksum algorithm implementation for card number verification
 */
export declare function luhnCheck(cardNumber: string): boolean;
/**
 * Validates a credit/debit card number
 */
export declare function validateCardNumber(cardNumber: string): CardValidationResult;
/**
 * Validates card expiry MM/YY
 */
export declare function validateExpiryDate(expiry: string): ExpiryValidationResult;
/**
 * Validates card CVV/CVC code
 */
export declare function validateCVV(cvv: string, brand?: CardBrand): CVVValidationResult;
/**
 * Generates a unique transaction identifier
 */
export declare function generateTransactionId(): string;
//# sourceMappingURL=payment-utils.d.ts.map