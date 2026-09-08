-- ============================================================================
-- Ecommerce: galería de imágenes de una VARIANTE de joyería.
-- ============================================================================
-- Gemela de public.ecommerce_imagenes_producto (ver
-- 20260903200000_ecommerce_catalogo_rpc.sql), pero colgando de
-- producto_variante_imagenes en vez de producto_imagenes.
--
-- Por qué una RPC y no un SELECT directo: producto_variante_imagenes NO tiene
-- RLS y su GRANT a `anon` es total (ver 20260902160003). Para no depender de
-- eso, el ecommerce nunca hace `.from('producto_variante_imagenes')` directo:
-- pasa por acá, que valida que la variante cuelgue de un producto `activo` de
-- la empresa que atiende el ecommerce y solo expone columnas seguras
-- (id / url / orden — nunca `path`).
--
-- "Portada" de la variante = la fila con `orden` más bajo (mismo criterio que
-- ecommerce_variantes_disponibles.imagen_portada); el frontend toma la
-- primera como portada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ecommerce_imagenes_variante(_id_variante bigint)
RETURNS TABLE (id bigint, url text, orden integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT vi.id, vi.url, vi.orden
  FROM producto_variante_imagenes vi
  JOIN producto_variantes v ON v.id = vi.id_variante
  JOIN productos p ON p.id = v.id_producto
  WHERE vi.id_variante = _id_variante
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true
  ORDER BY vi.orden ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_imagenes_variante(bigint) TO anon, authenticated, service_role;
