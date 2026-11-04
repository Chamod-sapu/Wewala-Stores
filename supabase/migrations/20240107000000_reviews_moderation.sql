-- ==============================================================================
-- Migration: Reviews Moderation Status & Product Rating Stats RPC
-- ==============================================================================

-- 1. Add status column to reviews if not exists ('pending', 'approved', 'hidden')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.reviews 
      ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved', 'hidden')) DEFAULT 'pending';
  END IF;
END $$;

-- Backfill status based on existing is_approved
UPDATE public.reviews 
SET status = CASE WHEN is_approved = true THEN 'approved' ELSE 'pending' END
WHERE status IS NULL;

-- 2. RPC: admin_moderate_reviews(review_ids, action)
-- Batch approval, hiding, unhiding/pending, or deletion of customer reviews
CREATE OR REPLACE FUNCTION public.admin_moderate_reviews(
  p_review_ids UUID[],
  p_action TEXT -- 'approve', 'hide', 'delete', 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can moderate customer reviews.';
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM public.reviews
    WHERE id = ANY(p_review_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_action = 'approve' THEN
    UPDATE public.reviews
    SET status = 'approved',
        is_approved = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = ANY(p_review_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_action = 'hide' THEN
    UPDATE public.reviews
    SET status = 'hidden',
        is_approved = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = ANY(p_review_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_action = 'pending' THEN
    UPDATE public.reviews
    SET status = 'pending',
        is_approved = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = ANY(p_review_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Invalid moderation action: %', p_action;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'affected_count', v_count
  );
END;
$$;

-- 3. RPC: get_product_review_stats()
-- Aggregates ratings count, average rating, star distributions, and approval metrics per product
CREATE OR REPLACE FUNCTION public.get_product_review_stats()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  thumbnail_url TEXT,
  total_reviews INTEGER,
  approved_reviews INTEGER,
  pending_reviews INTEGER,
  hidden_reviews INTEGER,
  average_rating NUMERIC(3, 2),
  count_5_star INTEGER,
  count_4_star INTEGER,
  count_3_star INTEGER,
  count_2_star INTEGER,
  count_1_star INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    (SELECT pi.url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS thumbnail_url,
    COUNT(r.id)::INTEGER AS total_reviews,
    COUNT(r.id) FILTER (WHERE r.is_approved = true OR r.status = 'approved')::INTEGER AS approved_reviews,
    COUNT(r.id) FILTER (WHERE r.status = 'pending' OR (r.status IS NULL AND r.is_approved = false))::INTEGER AS pending_reviews,
    COUNT(r.id) FILTER (WHERE r.status = 'hidden')::INTEGER AS hidden_reviews,
    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0.00) AS average_rating,
    COUNT(r.id) FILTER (WHERE r.rating = 5)::INTEGER AS count_5_star,
    COUNT(r.id) FILTER (WHERE r.rating = 4)::INTEGER AS count_4_star,
    COUNT(r.id) FILTER (WHERE r.rating = 3)::INTEGER AS count_3_star,
    COUNT(r.id) FILTER (WHERE r.rating = 2)::INTEGER AS count_2_star,
    COUNT(r.id) FILTER (WHERE r.rating = 1)::INTEGER AS count_1_star
  FROM public.products p
  LEFT JOIN public.reviews r ON p.id = r.product_id
  GROUP BY p.id, p.name, p.sku
  HAVING COUNT(r.id) > 0
  ORDER BY total_reviews DESC, average_rating DESC;
$$;

-- 4. Permissions & Public Profile Access (Allows reviewer names to display)
GRANT EXECUTE ON FUNCTION public.admin_moderate_reviews(UUID[], TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats() TO authenticated, anon;

-- Ensure public profile fields (name, avatar) can be read when loading product reviews
DROP POLICY IF EXISTS "Public profile fields viewable by all users" ON public.profiles;
CREATE POLICY "Public profile fields viewable by all users"
  ON public.profiles FOR SELECT
  USING (true);


