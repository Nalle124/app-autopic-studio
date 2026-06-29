
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS engine text;

CREATE OR REPLACE FUNCTION public.admin_get_engine_stats(p_days integer DEFAULT 30)
RETURNS TABLE(engine text, total bigint, completed bigint, failed bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(pj.engine, 'unknown') AS engine,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE pj.status = 'completed')::bigint AS completed,
    COUNT(*) FILTER (WHERE pj.status = 'failed')::bigint AS failed
  FROM public.processing_jobs pj
  WHERE pj.created_at >= now() - (p_days || ' days')::interval
  GROUP BY COALESCE(pj.engine, 'unknown')
  ORDER BY total DESC;
END;
$$;
