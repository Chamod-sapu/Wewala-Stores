import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { PlaceOrderParams } from './models';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Creates a strongly-typed Supabase client configured for Wewala Stores
 */
export function createStoreSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<'public'>
): TypedSupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required to initialize store client.');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
export async function invokePlaceOrder(
  client: TypedSupabaseClient,
  params: PlaceOrderParams
): Promise<{ orderId: string | null; error: Error | null }> {
  try {
    const { data, error } = await client.rpc('place_order', {
      items: params.items as any,
      shipping_address: params.shipping_address as any,
      payment_method: params.payment_method,
      coupon_code: params.coupon_code || null,
    });

    if (error) {
      return { orderId: null, error: new Error(error.message) };
    }

    return { orderId: data as string, error: null };
  } catch (err: any) {
    return { orderId: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
