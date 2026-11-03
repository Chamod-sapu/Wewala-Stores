-- ==============================================================================
-- Migration: Sales Analytics & Performance Reporting RPCs
-- ==============================================================================

-- 1. RPC: get_sales_analytics(start_date, end_date)
-- Computes gross/net revenue, order count, AOV, refunds, discounts, and shipping totals
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

  -- Gross revenue and orders from non-cancelled orders within range
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
    AND status <> 'cancelled';

  -- Refunds summary (orders where status = 'refunded' or payment_status = 'refunded')
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0.00)
  INTO 
    v_refunds_count,
    v_refunds_total
  FROM public.orders
  WHERE created_at >= p_start_date 
    AND created_at <= p_end_date
    AND (status = 'refunded' OR payment_status = 'refunded');

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

-- 2. RPC: get_sales_timeline(start_date, end_date)
-- Continuous daily revenue and orders count series
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

-- 3. RPC: get_sales_by_category_breakdown(start_date, end_date)
-- Revenue and units sold per product category
CREATE OR REPLACE FUNCTION public.get_sales_by_category_breakdown(
  p_start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  units_sold BIGINT,
  total_revenue NUMERIC(10, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS category_id,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS units_sold,
    COALESCE(SUM(oi.price_snapshot * oi.quantity), 0.00)::NUMERIC(10, 2) AS total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  LEFT JOIN public.categories c ON p.category_id = c.id
  WHERE o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.status <> 'cancelled'
  GROUP BY c.id, c.name
  ORDER BY total_revenue DESC;
$$;

-- 4. RPC: get_sales_by_payment_breakdown(start_date, end_date)
-- Orders count and revenue split across payment gateways/methods
CREATE OR REPLACE FUNCTION public.get_sales_by_payment_breakdown(
  p_start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  payment_method TEXT,
  order_count INTEGER,
  total_revenue NUMERIC(10, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    payment_method,
    COUNT(*)::INTEGER AS order_count,
    COALESCE(SUM(total), 0.00)::NUMERIC(10, 2) AS total_revenue
  FROM public.orders
  WHERE created_at >= p_start_date
    AND created_at <= p_end_date
    AND status <> 'cancelled'
  GROUP BY payment_method
  ORDER BY total_revenue DESC;
$$;

-- 5. RPC: get_sales_top_products_list(start_date, end_date, limit)
-- Best performing products by units sold and gross revenue
CREATE OR REPLACE FUNCTION public.get_sales_top_products_list(
  p_start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  category_name TEXT,
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
    p.sku,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS units_sold,
    COALESCE(SUM(oi.price_snapshot * oi.quantity), 0.00)::NUMERIC(10, 2) AS total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  LEFT JOIN public.categories c ON p.category_id = c.id
  WHERE o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.status <> 'cancelled'
  GROUP BY oi.product_id, p.name, oi.name_snapshot, p.sku, c.name
  ORDER BY units_sold DESC
  LIMIT p_limit;
$$;

