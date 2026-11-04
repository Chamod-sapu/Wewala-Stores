/**
 * RFC 1321 compliant zero-dependency MD5 message-digest algorithm.
 * Used for payment gateway signatures (e.g. PayHere Sri Lanka).
 */
/**
 * Computes standard MD5 hex hash of a string
 */
export declare function md5(str: string): string;
/**
 * Generates official PayHere Sri Lanka payment verification hash
 */
export declare function generatePayHereHash(merchantId: string, orderId: string, amount: number, currency: string | undefined, merchantSecret: string): string;
//# sourceMappingURL=md5.d.ts.map