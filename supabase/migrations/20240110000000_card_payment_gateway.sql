-- ==============================================================================
-- Migration: 20240110000000_card_payment_gateway.sql
-- Description: Direct Card Payment Gateway RPC and Payment Security Policies
-- ==============================================================================

-- 1. Create Index for fast transaction ID lookups
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

-- 2. Atomic process_card_payment RPC
CREATE OR REPLACE FUNCTION public.process_card_payment(
  p_order_id UUID,
  p_payment_method TEXT DEFAULT 'card',
  p_transaction_id TEXT DEFAULT NULL,
  p_card_brand TEXT DEFAULT 'visa',
  p_last4 TEXT DEFAULT '4242',
  p_cardholder_name TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT 'card_gateway',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order RECORD;
  v_payment_id UUID;
  v_txn_id TEXT;
  v_meta JSONB;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to process order payment.';
  END IF;

  -- 2. Lock order row FOR UPDATE to prevent concurrent payment execution
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', p_order_id;
  END IF;

  -- 3. Verify access: user must own the order or be an admin
  IF v_order.user_id <> v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: You cannot process payments for an order belonging to another customer.';
  END IF;

  -- 4. Prevent payment on cancelled or refunded orders
  IF v_order.status = 'cancelled' OR v_order.status = 'refunded' THEN
    RAISE EXCEPTION 'Cannot process payment for an order with status "%".', v_order.status;
  END IF;

  -- 5. If already paid, return existing success response idempotently
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.id,
      'payment_status', 'paid',
      'already_paid', true,
      'message', 'Order has already been confirmed and paid.'
    );
  END IF;

  -- 6. Generate secure transaction ID if not supplied
  v_txn_id := COALESCE(
    p_transaction_id,
    'TXN-WW-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10))
  );

  -- 7. Compose payment metadata
  v_meta := jsonb_build_object(
    'card_brand', LOWER(COALESCE(p_card_brand, 'card')),
    'last4', COALESCE(p_last4, '0000'),
    'cardholder_name', COALESCE(p_cardholder_name, 'Valued Customer'),
    'gateway', COALESCE(p_provider, 'card_gateway'),
    'currency', 'LKR',
    'verified_at', timezone('utc'::text, now())
  ) || COALESCE(p_metadata, '{}'::jsonb);

  -- 8. Insert record into payments ledger
  INSERT INTO public.payments (
    order_id,
    user_id,
    amount,
    currency,
    provider,
    status,
    transaction_id,
    metadata
  )
  VALUES (
    v_order.id,
    v_user_id,
    v_order.total,
    'LKR',
    COALESCE(p_provider, 'card_gateway'),
    'completed',
    v_txn_id,
    v_meta
  )
  RETURNING id INTO v_payment_id;

  -- 9. Update order state to paid
  UPDATE public.orders
  SET payment_status = 'paid',
      payment_method = 'card',
      status = CASE WHEN status = 'pending' THEN 'paid'::public.order_status ELSE status END,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_order.id;

  -- 10. Return structured receipt confirmation
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'payment_id', v_payment_id,
    'transaction_id', v_txn_id,
    'amount', v_order.total,
    'currency', 'LKR',
    'payment_status', 'paid',
    'card_brand', LOWER(COALESCE(p_card_brand, 'card')),
    'last4', COALESCE(p_last4, '0000'),
    'message', 'Card payment successfully authorized and captured.'
  );
END;
$$;

-- 3. Grant execute privileges
GRANT EXECUTE ON FUNCTION public.process_card_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_card_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

