// Supabase Edge Function: create-payment-session
// Generates a Stripe Checkout Session for order payments.
// Secrets (STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY) are read ONLY from Edge Function environment.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server environment variables not configured.');
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { order_id, return_url, cancel_url } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client to query order details
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: `Order ${order_id} not found: ${orderError?.message || 'unknown'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback URL calculations if not passed
    const reqOrigin = req.headers.get('origin') || 'http://localhost:5173';
    const successUrl = return_url || `${reqOrigin}/order-success?orderId=${order.id}&payment=success`;
    const failureUrl = cancel_url || `${reqOrigin}/checkout?cancelled=1&orderId=${order.id}`;

    // If STRIPE_SECRET_KEY is not configured (e.g. dev/local test environment),
    // provide a simulated session redirect for development testing.
    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY is not set in environment. Returning mock payment session.');

      // Record simulated pending payment in payments table
      await supabaseAdmin.from('payments').insert({
        order_id: order.id,
        user_id: order.user_id,
        amount: order.total,
        currency: 'LKR',
        provider: 'stripe_mock',
        status: 'pending',
        transaction_id: `mock_session_${order.id.slice(0, 8)}`,
        metadata: { mock: true, note: 'Configure STRIPE_SECRET_KEY in Edge Function secrets' },
      });

      return new Response(
        JSON.stringify({
          url: successUrl,
          session_id: `mock_session_${order.id}`,
          is_mock: true,
          message: 'STRIPE_SECRET_KEY not set; simulated checkout redirect provided.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create Stripe Checkout Session
    // LKR is a zero-decimal or standard currency depending on Stripe config; LKR has 2 decimals in Stripe (cents = amount * 100)
    const amountInCents = Math.round(Number(order.total) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: `Wewala Stores - Order #${order.id.slice(0, 8).toUpperCase()}`,
              description: `Total for ${order.order_items?.length || 1} items (incl. delivery)`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: failureUrl,
      metadata: {
        order_id: order.id,
        user_id: order.user_id || '',
      },
    });

    // Record pending payment in database
    await supabaseAdmin.from('payments').insert({
      order_id: order.id,
      user_id: order.user_id,
      amount: order.total,
      currency: 'LKR',
      provider: 'stripe',
      status: 'pending',
      transaction_id: session.id,
      metadata: {
        stripe_session_id: session.id,
        payment_intent: session.payment_intent,
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-payment-session:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

