-- ==============================================================================
-- Migration: Add cancel_order RPC and order cancellation policy
-- ==============================================================================

-- 1. Policy allowing users to update their own pending orders to cancelled
CREATE POLICY "Users can cancel own pending orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- 2. Atomic cancel_order RPC that updates status, restores stock, and logs inventory movements
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order RECORD;
  v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to cancel order.';
  END IF;

  -- Lock order row FOR UPDATE
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Validate permissions: user owns order or is admin
  IF v_order.user_id <> v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to cancel this order.';
  END IF;

  -- Validate order status is pending
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending orders can be cancelled. Current status is "%".', v_order.status;
  END IF;

  -- Update order status to cancelled
  UPDATE public.orders
  SET status = 'cancelled',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- Restock products and log inventory movements
  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    -- Increment product stock
    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_item.product_id;

    -- Record restock movement
    INSERT INTO public.inventory_movements (
      product_id,
      change,
      reason,
      order_id,
      created_by
    )
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'order_cancellation',
      p_order_id,
      v_user_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$$;

