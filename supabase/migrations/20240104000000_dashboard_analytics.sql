-- ==============================================================================
-- Migration: Dashboard Analytics RPCs and Realtime Publication
-- ==============================================================================

-- 1. Enable Supabase Realtime publication on orders and products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;

-- 2. RPC: get_dashboard_kpis()
-- Returns today's revenue, today's orders, new customers today, pending orders, and low-stock count
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', timezone('utc'::text, now()));
  v_today_revenue NUMERIC(10, 2) := 0.00;
  v_today_orders INTEGER := 0;
  v_new_customers_today INTEGER := 0;
  v_pending_orders INTEGER := 0;
  v_low_stock_count INTEGER := 0;
BEGIN
  -- Today's revenue from non-cancelled orders
  SELECT COALESCE(SUM(total), 0.00)
  INTO v_today_revenue
  FROM public.orders
  WHERE created_at >= v_today_start
    AND status <> 'cancelled';

  -- Today's orders count
  SELECT COUNT(*)
  INTO v_today_orders
  FROM public.orders
  WHERE created_at >= v_today_start;

  -- New customers registered today
  SELECT COUNT(*)
  INTO v_new_customers_today
  FROM public.profiles
  WHERE created_at >= v_today_start
    AND role = 'customer';

  -- Pending orders awaiting processing
  SELECT COUNT(*)
  INTO v_pending_orders
  FROM public.orders
  WHERE status = 'pending';

  -- Products with stock at or below low_stock_threshold
  SELECT COUNT(*)
  INTO v_low_stock_count
  FROM public.products
  WHERE stock <= low_stock_threshold
    AND is_active = true;

  RETURN jsonb_build_object(
    'today_revenue', v_today_revenue,
    'today_orders', v_today_orders,
    'new_customers_today', v_new_customers_today,
    'pending_orders', v_pending_orders,
    'low_stock_count', v_low_stock_count
  );
END;
$$;

-- 3. RPC: get_revenue_chart(days)
-- Returns daily timeline of revenue and orders for 7, 30, or 90 days
CREATE OR REPLACE FUNCTION public.get_revenue_chart(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  sale_date TEXT,
  revenue NUMERIC(10, 2),
  order_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      date_trunc('day', timezone('utc'::text, now())) - (p_days - 1) * INTERVAL '1 day',
      date_trunc('day', timezone('utc'::text, now())),
      INTERVAL '1 day'
    )::date AS day
  ),
  daily_sales AS (
    SELECT
      created_at::date AS day,
      COALESCE(SUM(total), 0) AS revenue,
      COUNT(id) AS order_count
    FROM public.orders
    WHERE created_at >= (timezone('utc'::text, now()) - (p_days * INTERVAL '1 day'))
      AND status <> 'cancelled'
    GROUP BY created_at::date
  )
  SELECT
    to_char(ds.day, 'YYYY-MM-DD') AS sale_date,
    COALESCE(s.revenue, 0.00)::NUMERIC(10, 2) AS revenue,
    COALESCE(s.order_count, 0)::INTEGER AS order_count
  FROM date_series ds
  LEFT JOIN daily_sales s ON ds.day = s.day
  ORDER BY ds.day ASC;
$$;

-- 4. RPC: get_orders_by_status()
-- Returns distribution of orders grouped by their current status
CREATE OR REPLACE FUNCTION public.get_orders_by_status()
RETURNS TABLE (
  status TEXT,
  order_count INTEGER,
  total_amount NUMERIC(10, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    status::text,
    COUNT(*)::INTEGER AS order_count,
    COALESCE(SUM(total), 0.00)::NUMERIC(10, 2) AS total_amount
  FROM public.orders
  GROUP BY status
  ORDER BY order_count DESC;
$$;

-- 5. RPC: get_top_selling_products(limit_count)
-- Returns best-selling items by total quantity and revenue
CREATE OR REPLACE FUNCTION public.get_top_selling_products(
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  units_sold BIGINT,
  total_revenue NUMERIC(10, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.product_id,
    COALESCE(p.name, oi.name_snapshot) AS product_name,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS units_sold,
    COALESCE(SUM(oi.price_snapshot * oi.quantity), 0.00)::NUMERIC(10, 2) AS total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  WHERE o.status <> 'cancelled'
  GROUP BY oi.product_id, p.name, oi.name_snapshot
  ORDER BY units_sold DESC
  LIMIT p_limit;
$$;

