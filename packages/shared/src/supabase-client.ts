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
export async function invokeProcessCardPayment(
  client: TypedSupabaseClient,
  params: ProcessCardPaymentParams
): Promise<{ data: ProcessCardPaymentResponse | null; error: Error | null }> {
  try {
    const { data, error } = await client.rpc('process_card_payment', {
      p_order_id: params.orderId,
      p_payment_method: 'card',
      p_transaction_id: params.transactionId || null,
      p_card_brand: params.cardBrand || 'visa',
      p_last4: params.last4 || '4242',
      p_cardholder_name: params.cardholderName || null,
      p_provider: params.provider || 'card_gateway',
      p_metadata: (params.metadata || {}) as any,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as unknown as ProcessCardPaymentResponse, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

