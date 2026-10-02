-- ============================================================================
-- Mercado Libre: validar antes de publicar (vista previa + precio sospechoso).
-- ============================================================================
-- Motivo: "cadena dorsal" se publicó con capturas de pantalla como fotos y un
-- grupo a $65 (el resto a ~$6,500); ML moderó todo. Dos defensas:
--   * ml_precios_minimos: umbral por variante = 20% de la mediana de precios
--     de sus piezas disponibles. Un grupo por debajo NO se publica (lo aplica
--     ml-sincronizar) y el panel lo marca. Es por variante y no por diseño:
--     una variante de plata no debe parecer "sospechosa" al lado de la de oro.
--   * ml_admin_previsualizar: lo que se va a publicar (grupos, precio, stock,
--     título aproximado y fotos) para revisarlo en el formulario antes de
--     guardar. Las fotos no se pueden validar solas: las mira una persona.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ml_precios_minimos(_id_producto bigint)
RETURNS TABLE (id_variante bigint, precio_minimo numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pi.id_variante,
         round((0.2 * percentile_cont(0.5) WITHIN GROUP (
           ORDER BY coalesce(pi.precio_oferta, pi.precio_venta)))::numeric, 2)
    FROM piezas_inventario pi
   WHERE pi.id_producto = _id_producto
     AND pi.estado = 'disponible'
   GROUP BY pi.id_variante;
$$;
REVOKE ALL ON FUNCTION public.ml_precios_minimos(bigint) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Vista previa: un renglón por grupo, agrupado igual que ml-sincronizar
-- (variante + peso + talla + precio efectivo). Fotos en el mismo orden que
-- las manda la sincronización: las de la variante y después las del diseño.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_admin_previsualizar(_id_producto bigint)
RETURNS TABLE (
  id_variante bigint, variante text, peso numeric, talla text, precio numeric,
  piezas bigint, precio_minimo numeric, sospechoso boolean, titulo text, fotos text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  WITH pz AS (
    SELECT pi.id_variante, pi.peso, coalesce(pi.talla, '') AS talla,
           coalesce(pi.precio_oferta, pi.precio_venta) AS precio
      FROM piezas_inventario pi
     WHERE pi.id_producto = _id_producto AND pi.estado = 'disponible'
  )
  SELECT pz.id_variante,
         concat_ws(' ', v.material, v.pureza),
         pz.peso,
         nullif(pz.talla, ''),
         pz.precio,
         count(*),
         m.precio_minimo,
         pz.precio < m.precio_minimo,
         -- Aproximado: el título final lo arma ML a partir del family_name.
         left(initcap(regexp_replace(concat_ws(' ', p.nombre, v.material, v.pureza), '\s+', ' ', 'g')), 60),
         ARRAY(
           SELECT f.url FROM (
             SELECT vi.url, 0 AS grupo, vi.orden FROM producto_variante_imagenes vi
              WHERE vi.id_variante = pz.id_variante
             UNION ALL
             SELECT pimg.url, 1, pimg.orden FROM producto_imagenes pimg
              WHERE pimg.id_producto = _id_producto
           ) f
           ORDER BY f.grupo, f.orden
           LIMIT 10
         )
    FROM pz
    JOIN producto_variantes v ON v.id = pz.id_variante
    JOIN productos p ON p.id = _id_producto
    JOIN ml_precios_minimos(_id_producto) m ON m.id_variante = pz.id_variante
   GROUP BY pz.id_variante, v.material, v.pureza, pz.peso, pz.talla, pz.precio,
            m.precio_minimo, p.nombre
   ORDER BY v.material, pz.peso, pz.talla, pz.precio;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_admin_previsualizar(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_admin_previsualizar(bigint) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- ml_admin_listar_disenos: suma cuántos grupos no se publican por precio
-- sospechoso. Cambia el RETURNS TABLE: hay que borrarla y recrearla.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ml_admin_listar_disenos();

CREATE FUNCTION public.ml_admin_listar_disenos()
RETURNS TABLE (
  id_producto bigint, nombre text, publicar boolean, ml_category_id text,
  atributos jsonb, piezas_disponibles bigint, publicaciones_activas bigint,
  publicaciones_con_error bigint, grupos_sospechosos bigint, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT c.id_producto::bigint, p.nombre, c.publicar, c.ml_category_id, c.atributos,
         (SELECT count(*) FROM piezas_inventario pi
           WHERE pi.id_producto = c.id_producto AND pi.estado = 'disponible'),
         (SELECT count(*) FROM ml_publicaciones mp
           WHERE mp.id_producto = c.id_producto AND mp.estado_ml = 'active'),
         (SELECT count(*) FROM ml_publicaciones mp
           WHERE mp.id_producto = c.id_producto AND mp.ultimo_error IS NOT NULL),
         (SELECT count(DISTINCT (pi.id_variante, pi.peso, coalesce(pi.talla, ''),
                                 coalesce(pi.precio_oferta, pi.precio_venta)))
            FROM piezas_inventario pi
            JOIN ml_precios_minimos(c.id_producto) m ON m.id_variante = pi.id_variante
           WHERE pi.id_producto = c.id_producto AND pi.estado = 'disponible'
             AND coalesce(pi.precio_oferta, pi.precio_venta) < m.precio_minimo),
         c.updated_at
    FROM ml_config_producto c
    JOIN productos p ON p.id = c.id_producto
   ORDER BY p.nombre;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_admin_listar_disenos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_admin_listar_disenos() TO authenticated, service_role;
