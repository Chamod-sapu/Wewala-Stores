import { describe, it, expect } from 'vitest';
import { detectCardBrand, formatCardNumber, formatExpiryDate, luhnCheck, validateCardNumber, validateExpiryDate, validateCVV, generateTransactionId, DEMO_TEST_CARDS, } from './payment-utils';
describe('payment-utils', () => {
    describe('detectCardBrand', () => {
        it('detects Visa correctly', () => {
            expect(detectCardBrand('4242 4242 4242 4242')).toBe('visa');
            expect(detectCardBrand('4000123456789010')).toBe('visa');
        });
        it('detects Mastercard correctly', () => {
            expect(detectCardBrand('5555 5555 5555 4444')).toBe('mastercard');
            expect(detectCardBrand('5100000000000000')).toBe('mastercard');
            expect(detectCardBrand('2221000000000000')).toBe('mastercard');
        });
        it('detects American Express correctly', () => {
            expect(detectCardBrand('3782 822463 10005')).toBe('amex');
            expect(detectCardBrand('340000000000000')).toBe('amex');
        });
        it('detects Discover correctly', () => {
            expect(detectCardBrand('6011 0000 0000 0000')).toBe('discover');
            expect(detectCardBrand('6500000000000000')).toBe('discover');
        });
        it('returns unknown for unrecognizable numbers', () => {
            expect(detectCardBrand('1234 5678 9012 3456')).toBe('unknown');
        });
    });
    describe('formatCardNumber', () => {
        it('formats standard 16 digit cards into groups of 4', () => {
            expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
        });
        it('formats Amex cards into 4-6-5 digits', () => {
            expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
        });
    });
    describe('formatExpiryDate', () => {
        it('adds slash after month', () => {
            expect(formatExpiryDate('1228')).toBe('12/28');
            expect(formatExpiryDate('12')).toBe('12');
        });
    });
    describe('luhnCheck & validateCardNumber', () => {
        it('validates test cards using Luhn algorithm', () => {
            DEMO_TEST_CARDS.forEach((card) => {
                expect(luhnCheck(card.number)).toBe(true);
                const result = validateCardNumber(card.number);
                expect(result.isValid).toBe(true);
                expect(result.brand).toBe(card.brand);
            });
        });
        it('rejects invalid card numbers', () => {
            const result = validateCardNumber('4242 4242 4242 4243');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('checksum');
        });
        it('rejects incomplete card numbers', () => {
            const result = validateCardNumber('4242');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('digits');
        });
    });
    describe('validateExpiryDate', () => {
        it('accepts future valid dates', () => {
            expect(validateExpiryDate('12/29').isValid).toBe(true);
        });
        it('rejects past dates', () => {
            expect(validateExpiryDate('01/20').isValid).toBe(false);
        });
        it('rejects invalid month numbers', () => {
            expect(validateExpiryDate('15/28').isValid).toBe(false);
        });
    });
    describe('validateCVV', () => {
        it('requires 3 digits for Visa and Mastercard', () => {
            expect(validateCVV('123', 'visa').isValid).toBe(true);
            expect(validateCVV('12', 'visa').isValid).toBe(false);
            expect(validateCVV('1234', 'mastercard').isValid).toBe(false);
        });
        it('requires 4 digits for Amex', () => {
            expect(validateCVV('1234', 'amex').isValid).toBe(true);
            expect(validateCVV('123', 'amex').isValid).toBe(false);
        });
    });
    describe('generateTransactionId', () => {
        it('produces formatted transaction ids', () => {
            const txn = generateTransactionId();
            expect(txn.startsWith('TXN-WW-')).toBe(true);
            expect(txn.length).toBeGreaterThan(12);
        });
    });
});
