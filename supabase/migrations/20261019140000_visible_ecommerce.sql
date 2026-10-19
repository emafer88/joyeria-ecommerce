-- Cada producto decide si aparece en la tienda en línea (ecommerce).
-- Por defecto sí, así lo que ya está publicado no cambia. Un producto oculto
-- sigue vendiéndose en el POS; en la tienda no se lista, no abre su ficha,
-- no sale en favoritos y el checkout lo rechaza (crear-preferencia-pago).

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS visible_ecommerce boolean NOT NULL DEFAULT true;

-- productos tiene SELECT por columna (ver 20261006120000_ocultar_costo.sql).
GRANT SELECT (visible_ecommerce) ON public.productos TO authenticated;

CREATE OR REPLACE VIEW public.productos_v WITH (security_barrier) AS
SELECT id, nombre, precio_venta,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra END AS precio_compra,
       id_categoria, codigo_barras, codigo_interno, id_empresa, sevende_por,
       maneja_inventarios, maneja_multiprecios, id_marca, descripcion,
       es_joyeria, created_at, updated_at, activo, destacado, precio_oferta,
       oferta_desde, oferta_hasta, medidas, tallas, visible_ecommerce
  FROM public.productos
 WHERE (SELECT admin_es_personal());

-- Funciones de la tienda: mismas definiciones que ya estaban, con el filtro
-- "AND p.visible_ecommerce" junto a "p.activo = true".

CREATE OR REPLACE FUNCTION public.ecommerce_listar_productos(_id_categoria integer DEFAULT NULL::integer, _material text DEFAULT NULL::text, _precio_min numeric DEFAULT NULL::numeric, _precio_max numeric DEFAULT NULL::numeric, _buscador text DEFAULT NULL::text, _pagina integer DEFAULT 1, _tam_pagina integer DEFAULT 24, _id_etiqueta bigint DEFAULT NULL::bigint, _solo_disponibles boolean DEFAULT NULL::boolean, _id_marca bigint DEFAULT NULL::bigint, _peso_min numeric DEFAULT NULL::numeric, _peso_max numeric DEFAULT NULL::numeric, _talla text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, nombre text, descripcion text, precio_venta numeric, id_categoria bigint, categoria text, es_joyeria boolean, imagen_portada text, total_disponible numeric, destacado boolean, precio_oferta numeric, marca text, etiquetas text[], total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      AND p.activo = true AND p.visible_ecommerce
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
$function$
;

CREATE OR REPLACE FUNCTION public.ecommerce_producto_detalle(_id_producto integer)
 RETURNS TABLE(id bigint, nombre text, descripcion text, id_categoria bigint, categoria text, es_joyeria boolean, precio_venta numeric, imagen_portada text, total_disponible numeric, destacado boolean, precio_oferta numeric, marca text, medidas text, tallas text, etiquetas text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    p.id, p.nombre, p.descripcion, p.id_categoria, c.nombre, p.es_joyeria, p.precio_venta,
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
    p.medidas,
    p.tallas,
    COALESCE((
      SELECT array_agg(e.nombre ORDER BY e.nombre)
      FROM producto_etiquetas pe
      JOIN etiquetas e ON e.id = pe.id_etiqueta
      WHERE pe.id_producto = p.id
    ), '{}') AS etiquetas
  FROM productos p
  JOIN categorias c ON c.id = p.id_categoria
  WHERE p.id = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true AND p.visible_ecommerce;
$function$
;

CREATE OR REPLACE FUNCTION public.ecommerce_listar_favoritos()
 RETURNS TABLE(id bigint, nombre text, descripcion text, precio_venta numeric, id_categoria bigint, categoria text, es_joyeria boolean, imagen_portada text, total_disponible numeric, destacado boolean, precio_oferta numeric, marca text, etiquetas text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    p.id, p.nombre, p.descripcion, p.precio_venta, p.id_categoria, c.nombre AS categoria,
    p.es_joyeria,
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
  FROM public.ecommerce_favorito f
  JOIN public.productos p ON p.id = f.id_producto
  JOIN public.categorias c ON c.id = p.id_categoria
  WHERE f.user_id = auth.uid() AND p.activo = true AND p.visible_ecommerce
  ORDER BY f.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.ecommerce_variantes_disponibles(_id_producto integer)
 RETURNS TABLE(id_variante bigint, material text, pureza text, precio_venta_sugerido numeric, imagen_portada text, piezas_disponibles bigint, tallas_disponibles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    count(pz.id) FILTER (WHERE pz.estado = 'disponible') AS piezas_disponibles,
    COALESCE((
      SELECT array_agg(DISTINCT pz2.talla ORDER BY pz2.talla)
      FROM piezas_inventario pz2
      WHERE pz2.id_variante = v.id AND pz2.estado = 'disponible' AND pz2.talla IS NOT NULL
    ), '{}') AS tallas_disponibles
  FROM producto_variantes v
  JOIN productos p ON p.id = v.id_producto
  LEFT JOIN piezas_inventario pz ON pz.id_variante = v.id AND pz.estado = 'disponible'
  WHERE v.id_producto = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true AND p.visible_ecommerce
  GROUP BY v.id, v.material, v.pureza, v.precio_venta_sugerido
  ORDER BY v.material, v.pureza;
$function$
;
