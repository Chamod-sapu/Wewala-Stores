import { createClient } from '@supabase/supabase-js';
/**
 * Creates a strongly-typed Supabase client configured for Wewala Stores
 */
export function createStoreSupabaseClient(supabaseUrl, supabaseAnonKey, options) {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are required to initialize store client.');
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        ...options,
    });
}
/**
 * Helper to invoke the atomic checkout place_order RPC
 */
export async function invokePlaceOrder(client, params) {
    try {
        const { data, error } = await client.rpc('place_order', {
            items: params.items,
            shipping_address: params.shipping_address,
            payment_method: params.payment_method,
            coupon_code: params.coupon_code || null,
        });
        if (error) {
            return { orderId: null, error: new Error(error.message) };
        }
        return { orderId: data, error: null };
    }
    catch (err) {
        return { orderId: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
}
