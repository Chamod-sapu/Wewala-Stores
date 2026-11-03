// Supabase Edge Function: payment-webhook
// Securely verifies Stripe signatures and marks orders as paid upon checkout.session.completed.
// Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY) are read ONLY from Edge Function environment.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase admin credentials missing');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;

  // If webhook secret is configured, perform strict signature verification
  if (webhookSecret && stripeSecretKey) {
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: `Signature verification failed: ${err.message}` }), { status: 400 });
    }
  } else {
    // If webhook secret is omitted (e.g. testing), parse directly with warning
    console.warn('STRIPE_WEBHOOK_SECRET not provided. Parsing unverified webhook payload for dev/test.');
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400 });
    }
  }

  console.log(`Processing Stripe event: ${event.type} (id: ${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (!orderId) {
          console.warn('checkout.session.completed received without metadata.order_id');
          break;
        }

        console.log(`Fulfilling Order ID: ${orderId} from Stripe session ${session.id}`);

        // 1. Update order status to paid
        const { error: orderUpdateErr } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (orderUpdateErr) {
          console.error(`Failed to update order ${orderId}:`, orderUpdateErr);
          throw orderUpdateErr;
        }

        // 2. Upsert payment record
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        await supabaseAdmin.from('payments').upsert(
          {
            order_id: orderId,
            user_id: session.metadata?.user_id || null,
            amount: amountTotal,
            currency: (session.currency || 'lkr').toUpperCase(),
            provider: 'stripe',
            status: 'completed',
            transaction_id: session.id,
            metadata: {
              stripe_event_id: event.id,
              payment_intent: session.payment_intent,
              customer_email: session.customer_details?.email,
              payment_status: session.payment_status,
            },
          },
          { onConflict: 'order_id' }
        );

        console.log(`Order ${orderId} successfully marked as paid!`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;
        if (orderId) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

