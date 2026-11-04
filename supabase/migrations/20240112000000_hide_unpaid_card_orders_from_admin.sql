-- ==============================================================================
-- Migration: Hide Unpaid / Pending Card Orders from Admin Analytics & Dashboards
-- ==============================================================================
-- Rule:
-- 1. Card orders (payment_method IN ('card', 'stripe', 'payhere')) are ONLY
--    visible in admin metrics and reports if payment_status = 'paid'.
-- 2. Cash on Delivery (COD) orders remain immediately visible regardless of payment status.
-- ==============================================================================

-- 1. Update get_dashboard_kpis()
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
  -- Today's revenue from non-cancelled, admin-visible orders
  SELECT COALESCE(SUM(total), 0.00)
  INTO v_today_revenue
  FROM public.orders
  WHERE created_at >= v_today_start
    AND status <> 'cancelled'
    AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid');

  -- Today's admin-visible orders count
  SELECT COUNT(*)
  INTO v_today_orders
  FROM public.orders
  WHERE created_at >= v_today_start
    AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid');

  -- New customers registered today
  SELECT COUNT(*)
  INTO v_new_customers_today
  FROM public.profiles
  WHERE created_at >= v_today_start
    AND role = 'customer';

  -- Pending fulfillment orders (COD pending or paid card orders awaiting processing)
  SELECT COUNT(*)
  INTO v_pending_orders
  FROM public.orders
  WHERE status = 'pending'
    AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid');

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

-- 2. Update get_revenue_chart(days)
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
      AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid')
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

-- 3. Update get_orders_by_status()
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
  WHERE (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid')
  GROUP BY status
  ORDER BY order_count DESC;
$$;

-- 4. Update get_top_selling_products(limit_count)
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
    AND (o.payment_method NOT IN ('card', 'stripe', 'payhere') OR o.payment_status = 'paid')
  GROUP BY oi.product_id, COALESCE(p.name, oi.name_snapshot)
  ORDER BY units_sold DESC
  LIMIT p_limit;
$$;

-- 5. Update get_sales_analytics(start_date, end_date)
CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  p_start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross_revenue NUMERIC(10, 2) := 0.00;
  v_orders_count INTEGER := 0;
  v_refunds_count INTEGER := 0;
  v_refunds_total NUMERIC(10, 2) := 0.00;
  v_discounts_total NUMERIC(10, 2) := 0.00;
  v_shipping_total NUMERIC(10, 2) := 0.00;
  v_net_revenue NUMERIC(10, 2) := 0.00;
  v_aov NUMERIC(10, 2) := 0.00;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view sales analytics.';
  END IF;

  -- Gross revenue and orders from non-cancelled, admin-visible orders within range
  SELECT 
    COALESCE(SUM(total), 0.00),
    COUNT(*),
    COALESCE(SUM(discount), 0.00),
    COALESCE(SUM(shipping), 0.00)
  INTO 
    v_gross_revenue,
    v_orders_count,
    v_discounts_total,
    v_shipping_total
  FROM public.orders
  WHERE created_at >= p_start_date 
    AND created_at <= p_end_date
    AND status <> 'cancelled'
    AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid');

  -- Refunds summary
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0.00)
  INTO 
    v_refunds_count,
    v_refunds_total
  FROM public.orders
  WHERE created_at >= p_start_date 
    AND created_at <= p_end_date
    AND (status = 'refunded' OR payment_status = 'refunded')
    AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid');

  -- Net revenue = Gross revenue minus refunds
  v_net_revenue := GREATEST(0.00, v_gross_revenue - v_refunds_total);

  -- Average order value calculation
  IF v_orders_count > 0 THEN
    v_aov := ROUND((v_gross_revenue / v_orders_count)::numeric, 2);
  ELSE
    v_aov := 0.00;
  END IF;

  RETURN jsonb_build_object(
    'gross_revenue', v_gross_revenue,
    'net_revenue', v_net_revenue,
    'orders_count', v_orders_count,
    'average_order_value', v_aov,
    'refunds_count', v_refunds_count,
    'refunds_total', v_refunds_total,
    'discounts_total', v_discounts_total,
    'shipping_total', v_shipping_total
  );
END;
$$;

-- 6. Update get_sales_timeline(start_date, end_date)
CREATE OR REPLACE FUNCTION public.get_sales_timeline(
  p_start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
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
      date_trunc('day', p_start_date),
      date_trunc('day', p_end_date),
      INTERVAL '1 day'
    )::date AS day
  ),
  daily_sales AS (
    SELECT
      created_at::date AS day,
      COALESCE(SUM(total), 0) AS revenue,
      COUNT(id) AS order_count
    FROM public.orders
    WHERE created_at >= p_start_date
      AND created_at <= p_end_date
      AND status <> 'cancelled'
      AND (payment_method NOT IN ('card', 'stripe', 'payhere') OR payment_status = 'paid')
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

