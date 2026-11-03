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
//# sourceMappingURL=supabase-client.d.ts.map