-- ============================================================================
-- Mercado Libre: guardar el pack de cada orden para enlazarla desde el panel.
-- ============================================================================
-- En la web del vendedor, la venta se identifica por el pack_id ("Venta
-- #2000015270820749"), no por el id de la orden: toda compra con Mercado
-- Envíos queda dentro de un pack aunque tenga un solo producto. Las órdenes
-- sin pack (pack_id null) se enlazan por su propio id. ml-webhook lo guarda
-- a partir de esta migración.
-- ============================================================================

ALTER TABLE public.ml_ordenes ADD COLUMN IF NOT EXISTS pack_id bigint;

-- Las dos órdenes de prueba registradas antes de este cambio (packs leídos
-- de GET /orders/{id}).
UPDATE public.ml_ordenes SET pack_id = 2000015270787617 WHERE ml_order_id = 2000018710287222 AND pack_id IS NULL;
UPDATE public.ml_ordenes SET pack_id = 2000015270820749 WHERE ml_order_id = 2000018710356810 AND pack_id IS NULL;


-- Cambia el RETURNS TABLE: hay que borrarla y recrearla.
DROP FUNCTION IF EXISTS public.ml_admin_listar_ordenes();

CREATE FUNCTION public.ml_admin_listar_ordenes()
RETURNS TABLE (
  ml_order_id bigint, pack_id bigint, estado_ml text, comprador text, total numeric,
  ultimo_error text, created_at timestamptz, updated_at timestamptz,
  id_venta bigint, nro_comprobante text, estado_venta text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT o.ml_order_id, o.pack_id, o.estado_ml, o.comprador, o.total, o.ultimo_error,
         o.created_at, o.updated_at, o.id_venta, v.nro_comprobante, v.estado
    FROM ml_ordenes o
    LEFT JOIN ventas v ON v.id = o.id_venta
   ORDER BY (o.ultimo_error IS NULL), o.created_at DESC
   LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_admin_listar_ordenes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_admin_listar_ordenes() TO authenticated, service_role;
