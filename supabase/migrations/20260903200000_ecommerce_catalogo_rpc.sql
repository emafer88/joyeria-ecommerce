-- ============================================================================
-- Ecommerce: RPCs públicas de catálogo de solo lectura.
-- ============================================================================
-- Estas funciones son el ÚNICO punto de acceso al catálogo desde la anon key
-- del ecommerce (proyecto joyeria-ecommerce, mismo Supabase que el POS).
--
-- Por qué existen en vez de leer las tablas directo:
--   - producto_variantes / piezas_inventario tienen RLS habilitado SIN
--     política para el rol `anon` -> un SELECT directo devuelve 0 filas.
--     Estas funciones son SECURITY DEFINER para poder leerlas igual, pero
--     solo devuelven columnas seguras (nunca costo/id_venta_reserva/etc).
--   - productos / stock / producto_imagenes NO tienen RLS y su GRANT a
--     `anon` es total (lectura y escritura) a nivel de toda la base — para
--     no depender de eso, el ecommerce nunca hace `.from('productos')`
--     directo, siempre pasa por acá, que ya filtra `activo=true` y nunca
--     expone `precio_compra`/`codigo_interno`.
--
-- id_empresa fijo: esta base sirve HOY a una sola joyería real
-- (id=1, "Joyeria max"). Hay una segunda empresa de prueba (id=5,
-- "Generica", 1 solo producto) que se ignora a propósito. Queda como
-- backlog (fuera de este MVP) un panel de admin para hacerlo configurable;
-- mientras tanto se centraliza en una sola función para no repetir el
-- literal "1" en cada RPC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ecommerce_id_empresa()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 1;
$$;

COMMENT ON FUNCTION public.ecommerce_id_empresa() IS
  'Empresa fija que atiende el ecommerce. Backlog: reemplazar por config elegible desde un panel de admin.';

GRANT EXECUTE ON FUNCTION public.ecommerce_id_empresa() TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 1) Categorías
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_listar_categorias()
RETURNS TABLE (id bigint, nombre text, icono text, color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.nombre, c.icono, c.color
  FROM categorias c
  WHERE c.id_empresa = public.ecommerce_id_empresa()
  ORDER BY c.nombre;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_categorias() TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2) Listado de productos con filtros + paginación.
--    total_disponible: piezas 'disponible' si es_joyeria, suma de stock si
--    maneja_inventarios, NULL si el producto no lleva control de stock
--    (se interpreta como "siempre disponible" del lado del frontend).
--    total_count: total de filas que matchean el filtro (sin paginar), para
--    poder armar la paginación sin una segunda llamada.
-- ----------------------------------------------------------------------------
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
      END AS total_disponible
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
    b.es_joyeria, b.imagen_portada, b.total_disponible,
    count(*) OVER() AS total_count
  FROM base b
  ORDER BY b.nombre ASC
  LIMIT GREATEST(_tam_pagina, 1)
  OFFSET GREATEST(_pagina - 1, 0) * GREATEST(_tam_pagina, 1);
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_productos(integer, text, numeric, numeric, text, integer, integer)
  TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3) Detalle de un producto puntual.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_producto_detalle(_id_producto integer)
RETURNS TABLE (
  id bigint,
  nombre text,
  descripcion text,
  id_categoria bigint,
  categoria text,
  es_joyeria boolean,
  precio_venta numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.nombre, p.descripcion, p.id_categoria, c.nombre, p.es_joyeria, p.precio_venta
  FROM productos p
  JOIN categorias c ON c.id = p.id_categoria
  WHERE p.id = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_producto_detalle(integer) TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 4) Galería de imágenes de un producto (portada = orden más bajo, ya
--    ordenado; el frontend toma el primero como portada).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_imagenes_producto(_id_producto integer)
RETURNS TABLE (id bigint, url text, orden integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pi.id, pi.url, pi.orden
  FROM producto_imagenes pi
  JOIN productos p ON p.id = pi.id_producto
  WHERE pi.id_producto = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true
  ORDER BY pi.orden ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_imagenes_producto(integer) TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 5) Variantes de un diseño de joyería (material/pureza) con conteo de
--    piezas disponibles e imagen de portada de la variante.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_variantes_disponibles(_id_producto integer)
RETURNS TABLE (
  id_variante bigint,
  material text,
  pureza text,
  precio_venta_sugerido numeric,
  imagen_portada text,
  piezas_disponibles bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    v.id AS id_variante,
    v.material,
    v.pureza,
    v.precio_venta_sugerido,
    (
      SELECT vi.url FROM producto_variante_imagenes vi
      WHERE vi.id_variante = v.id
      ORDER BY vi.orden ASC LIMIT 1
    ) AS imagen_portada,
    count(pz.id) FILTER (WHERE pz.estado = 'disponible') AS piezas_disponibles
  FROM producto_variantes v
  JOIN productos p ON p.id = v.id_producto
  LEFT JOIN piezas_inventario pz ON pz.id_variante = v.id AND pz.estado = 'disponible'
  WHERE v.id_producto = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true
  GROUP BY v.id, v.material, v.pureza, v.precio_venta_sugerido
  ORDER BY v.material, v.pureza;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_variantes_disponibles(integer) TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 6) Piezas puntuales disponibles de una variante (para elegir una pieza
--    concreta al agregar al carrito). Nunca expone costo ni barcode interno.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_piezas_disponibles(_id_variante bigint)
RETURNS TABLE (id_pieza bigint, sku text, peso numeric, precio_venta numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pz.id, pz.sku, pz.peso, pz.precio_venta
  FROM piezas_inventario pz
  WHERE pz.id_variante = _id_variante
    AND pz.id_empresa = public.ecommerce_id_empresa()
    AND pz.estado = 'disponible'
  ORDER BY pz.precio_venta ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_piezas_disponibles(bigint) TO anon, authenticated, service_role;
