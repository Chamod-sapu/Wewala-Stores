import { describe, it, expect } from 'vitest';
import { md5, generatePayHereHash } from './md5';
describe('md5 & generatePayHereHash', () => {
    it('computes correct MD5 hashes for standard test vectors', () => {
        expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
        expect(md5('hello world')).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
        expect(md5('payhere')).toBe('bd631fa882bc4219056ac4fcc964c1c4');
    });
    it('generates uppercase PayHere payment hash correctly', () => {
        // Test PayHere formula:
        // hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
        const merchantId = '1211149';
        const orderId = 'Order12345';
        const amount = 1000;
        const currency = 'LKR';
        const secret = '4XxYyZz1234';
        const hash = generatePayHereHash(merchantId, orderId, amount, currency, secret);
        expect(hash).toMatch(/^[A-F0-9]{32}$/);
        expect(hash.length).toBe(32);
    });
});
