import { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { PlaceOrderParams } from './models';
export type TypedSupabaseClient = SupabaseClient<Database>;
/**
 * Creates a strongly-typed Supabase client configured for Wewala Stores
 */
export declare function createStoreSupabaseClient(supabaseUrl: string, supabaseAnonKey: string, options?: SupabaseClientOptions<'public'>): TypedSupabaseClient;
/**
 * Helper to invoke the atomic checkout place_order RPC
 */
export declare function invokePlaceOrder(client: TypedSupabaseClient, params: PlaceOrderParams): Promise<{
    orderId: string | null;
    error: Error | null;
}>;
export interface ProcessCardPaymentParams {
    orderId: string;
    transactionId?: string;
    cardBrand?: string;
    last4?: string;
    cardholderName?: string;
    provider?: string;
    metadata?: Record<string, any>;
}
export interface ProcessCardPaymentResponse {
    success: boolean;
    order_id?: string;
    payment_id?: string;
    transaction_id?: string;
    amount?: number;
    currency?: string;
    payment_status?: string;
    card_brand?: string;
    last4?: string;
    message?: string;
}
/**
 * Helper to invoke the atomic process_card_payment RPC
 */
export declare function invokeProcessCardPayment(client: TypedSupabaseClient, params: ProcessCardPaymentParams): Promise<{
    data: ProcessCardPaymentResponse | null;
    error: Error | null;
}>;
//# sourceMappingURL=supabase-client.d.ts.map