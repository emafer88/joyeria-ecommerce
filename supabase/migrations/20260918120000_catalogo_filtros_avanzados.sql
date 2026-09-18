-- ============================================================================
-- Filtros avanzados de catálogo: disponibilidad, colección (marca), peso,
-- talla, y búsqueda ampliada a SKU/descripción/medidas/tallas.
--   - Mismo patrón que 20260910130000_catalogo_ficha_tecnica.sql: los
--     parámetros nuevos van al final con DEFAULT NULL, así que las llamadas
--     viejas siguen funcionando (PostgREST matchea por nombre).
--   - Color y las 6 categorías del checklist quedan afuera a propósito (ver
--     memoria del proyecto): color no tiene dato en ningún lado del esquema
--     todavía, y las categorías reales se cargan a mano desde el admin.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Listado: agrega _solo_disponibles, _id_marca, _peso_min/_peso_max,
--    _talla, y amplía _buscador a descripción/medidas/tallas/SKU.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_listar_productos(integer, text, numeric, numeric, text, integer, integer, bigint);

CREATE OR REPLACE FUNCTION public.ecommerce_listar_productos(
  _id_categoria integer DEFAULT NULL,
  _material text DEFAULT NULL,
  _precio_min numeric DEFAULT NULL,
  _precio_max numeric DEFAULT NULL,
  _buscador text DEFAULT NULL,
  _pagina integer DEFAULT 1,
  _tam_pagina integer DEFAULT 24,
  _id_etiqueta bigint DEFAULT NULL,
  _solo_disponibles boolean DEFAULT NULL,
  _id_marca bigint DEFAULT NULL,
  _peso_min numeric DEFAULT NULL,
  _peso_max numeric DEFAULT NULL,
  _talla text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  nombre text,
  descripcion text,
  precio_venta numeric,
  id_categoria bigint,
  categoria text,
  es_joyeria boolean,
  imagen_portada text,
  total_disponible numeric,
  destacado boolean,
  precio_oferta numeric,
  marca text,
  etiquetas text[],
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT
      p.id, p.nombre, p.descripcion, p.precio_venta, p.id_categoria,
      c.nombre AS categoria, p.es_joyeria,
      (
        SELECT pi.url FROM producto_imagenes pi
        WHERE pi.id_producto = p.id
        ORDER BY pi.orden ASC LIMIT 1
      ) AS imagen_portada,
      CASE
        WHEN p.es_joyeria THEN (
          SELECT count(*)::numeric FROM piezas_inventario pz
          WHERE pz.id_producto = p.id AND pz.estado = 'disponible'
        )
        WHEN p.maneja_inventarios THEN (
          SELECT COALESCE(sum(s.stock), 0) FROM stock s
          WHERE s.id_producto = p.id
        )
        ELSE NULL
      END AS total_disponible,
      p.destacado,
      CASE
        WHEN p.precio_oferta IS NOT NULL
         AND (p.oferta_desde IS NULL OR now() >= p.oferta_desde)
         AND (p.oferta_hasta IS NULL OR now() <= p.oferta_hasta)
        THEN p.precio_oferta
        ELSE NULL
      END AS precio_oferta,
      (SELECT m.nombre FROM marca m WHERE m.id = p.id_marca) AS marca,
      COALESCE((
        SELECT array_agg(e.nombre ORDER BY e.nombre)
        FROM producto_etiquetas pe
        JOIN etiquetas e ON e.id = pe.id_etiqueta
        WHERE pe.id_producto = p.id
      ), '{}') AS etiquetas
    FROM productos p
    JOIN categorias c ON c.id = p.id_categoria
    WHERE p.id_empresa = public.ecommerce_id_empresa()
      AND p.activo = true
      AND (_id_categoria IS NULL OR p.id_categoria = _id_categoria)
      AND (_precio_min IS NULL OR p.precio_venta >= _precio_min)
      AND (_precio_max IS NULL OR p.precio_venta <= _precio_max)
      AND (
        _buscador IS NULL
        OR p.nombre ILIKE '%' || _buscador || '%'
        OR p.descripcion ILIKE '%' || _buscador || '%'
        OR p.medidas ILIKE '%' || _buscador || '%'
        OR p.tallas ILIKE '%' || _buscador || '%'
        OR EXISTS (
          SELECT 1 FROM piezas_inventario pz
          WHERE pz.id_producto = p.id AND pz.sku ILIKE '%' || _buscador || '%'
        )
      )
      AND (
        _material IS NULL OR EXISTS (
          SELECT 1 FROM producto_variantes v
          WHERE v.id_producto = p.id AND v.material ILIKE _material
        )
      )
      AND (
        _id_etiqueta IS NULL OR EXISTS (
          SELECT 1 FROM producto_etiquetas pe
          WHERE pe.id_producto = p.id AND pe.id_etiqueta = _id_etiqueta
        )
      )
      AND (_id_marca IS NULL OR p.id_marca = _id_marca)
      AND (
        (_peso_min IS NULL AND _peso_max IS NULL) OR EXISTS (
          SELECT 1 FROM piezas_inventario pz
          WHERE pz.id_producto = p.id
            AND (_peso_min IS NULL OR pz.peso >= _peso_min)
            AND (_peso_max IS NULL OR pz.peso <= _peso_max)
        )
      )
      AND (
        _talla IS NULL
        OR EXISTS (
          SELECT 1 FROM piezas_inventario pz
          WHERE pz.id_producto = p.id AND pz.talla ILIKE _talla
        )
        OR p.tallas ILIKE '%' || _talla || '%'
      )
  )
  SELECT
    b.id, b.nombre, b.descripcion, b.precio_venta, b.id_categoria, b.categoria,
    b.es_joyeria, b.imagen_portada, b.total_disponible, b.destacado, b.precio_oferta,
    b.marca, b.etiquetas,
    count(*) OVER() AS total_count
  FROM base b
  WHERE (_solo_disponibles IS NOT TRUE OR COALESCE(b.total_disponible, 0) > 0)
  ORDER BY b.nombre ASC
  LIMIT GREATEST(_tam_pagina, 1)
  OFFSET GREATEST(_pagina - 1, 0) * GREATEST(_tam_pagina, 1);
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_productos(integer, text, numeric, numeric, text, integer, integer, bigint, boolean, bigint, numeric, numeric, text)
  TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2) Materiales y marcas/colecciones reales, para poblar los <select> del
--    catálogo (mismo patrón que ecommerce_listar_categorias/_etiquetas).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_listar_materiales()
RETURNS TABLE (material text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT v.material
  FROM producto_variantes v
  WHERE v.id_empresa = public.ecommerce_id_empresa()
  ORDER BY v.material;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_materiales() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ecommerce_listar_marcas()
RETURNS TABLE (id bigint, nombre text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id, m.nombre FROM marca m
  WHERE m.id_empresa = public.ecommerce_id_empresa()
  ORDER BY m.nombre;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_marcas() TO anon, authenticated, service_role;
