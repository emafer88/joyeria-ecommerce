-- ============================================================================
-- Home del ecommerce: consumo de "destacado" / "oferta con vigencia"
-- (agregados a `productos` en proyecto-joyeria) y de la tabla nueva
-- `banners`. Todo se administra desde proyecto-joyeria — acá solo se agregan
-- las RPC de solo lectura para el catálogo público, mismo criterio que el
-- resto de ecommerce_catalogo_rpc.sql (nunca leer las tablas directo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ecommerce_listar_productos: agrega `destacado` y `precio_oferta`.
-- `precio_oferta` sale NULL salvo que la oferta esté vigente ahora mismo
-- (así el frontend no necesita saber nada de fechas, solo mostrar el precio
-- tachado cuando no es NULL).
--
-- Postgres no permite que CREATE OR REPLACE cambie las columnas de un
-- RETURNS TABLE existente (el "row type" definido por los OUT params) — hay
-- que borrar la función vieja primero.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_listar_productos(integer, text, numeric, numeric, text, integer, integer);

CREATE OR REPLACE FUNCTION public.ecommerce_listar_productos(
  _id_categoria integer DEFAULT NULL,
  _material text DEFAULT NULL,
  _precio_min numeric DEFAULT NULL,
  _precio_max numeric DEFAULT NULL,
  _buscador text DEFAULT NULL,
  _pagina integer DEFAULT 1,
  _tam_pagina integer DEFAULT 24
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
      END AS precio_oferta
    FROM productos p
    JOIN categorias c ON c.id = p.id_categoria
    WHERE p.id_empresa = public.ecommerce_id_empresa()
      AND p.activo = true
      AND (_id_categoria IS NULL OR p.id_categoria = _id_categoria)
      AND (_precio_min IS NULL OR p.precio_venta >= _precio_min)
      AND (_precio_max IS NULL OR p.precio_venta <= _precio_max)
      AND (_buscador IS NULL OR p.nombre ILIKE '%' || _buscador || '%')
      AND (
        _material IS NULL OR EXISTS (
          SELECT 1 FROM producto_variantes v
          WHERE v.id_producto = p.id AND v.material ILIKE _material
        )
      )
  )
  SELECT
    b.id, b.nombre, b.descripcion, b.precio_venta, b.id_categoria, b.categoria,
    b.es_joyeria, b.imagen_portada, b.total_disponible, b.destacado, b.precio_oferta,
    count(*) OVER() AS total_count
  FROM base b
  ORDER BY b.nombre ASC
  LIMIT GREATEST(_tam_pagina, 1)
  OFFSET GREATEST(_pagina - 1, 0) * GREATEST(_tam_pagina, 1);
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_productos(integer, text, numeric, numeric, text, integer, integer)
  TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Banners activos del hero del home, ya ordenados.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_listar_banners()
RETURNS TABLE (
  id bigint,
  titulo text,
  subtitulo text,
  imagen_url text,
  link_destino text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.id, b.titulo, b.subtitulo, b.imagen_url, b.link_destino
  FROM banners b
  WHERE b.id_empresa = public.ecommerce_id_empresa()
    AND b.activo = true
  ORDER BY b.orden ASC, b.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_banners() TO anon, authenticated, service_role;
