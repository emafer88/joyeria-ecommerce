-- Fase C2: tallas y colores en la tienda.
--
-- * ecommerce_orden_items.id_combinacion: la talla/color de cada línea del
--   pedido; crear_venta_externa_piezas la pasa a detalle_venta al confirmar
--   el pago (validarstock descuenta de esa combinación).
-- * ecommerce_producto_combinaciones: tallas y colores de un producto con su
--   existencia, para la ficha.
-- * producto_imagenes.color: foto de un color (NULL = de todos); la ficha
--   cambia de fotos al elegir color.
-- * ecommerce_catalogo: filtro de talla por existencia en productos con
--   combinaciones, filtro de colores (_f.colores) y facetas 'tallas' y
--   'colores'. Mismo cuerpo que en 20261027130000_subcategorias + eso.
-- * admin_detalle_pedido_ecommerce: el nombre lleva la talla/color.

ALTER TABLE public.ecommerce_orden_items
  ADD COLUMN IF NOT EXISTS id_combinacion bigint NULL
    REFERENCES public.producto_combinaciones(id) ON DELETE SET NULL;

ALTER TABLE public.producto_imagenes
  ADD COLUMN IF NOT EXISTS color text NULL;

CREATE OR REPLACE FUNCTION public.ecommerce_producto_combinaciones(_id_producto integer)
RETURNS TABLE (id bigint, talla text, color text, color_hex text, orden integer, disponible numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pc.id, pc.talla, pc.color, pc.color_hex, pc.orden,
         COALESCE((SELECT sum(s.stock) FROM stock s WHERE s.id_combinacion = pc.id), 0)
    FROM producto_combinaciones pc
    JOIN productos p ON p.id = pc.id_producto
   WHERE pc.id_producto = _id_producto
     AND pc.activo
     AND p.id_empresa = ecommerce_id_empresa()
     AND p.activo AND p.visible_ecommerce
   ORDER BY pc.orden;
$$;
REVOKE ALL ON FUNCTION public.ecommerce_producto_combinaciones(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ecommerce_producto_combinaciones(integer) TO anon, authenticated, service_role;

-- Cambia RETURNS TABLE (suma color) -> DROP + CREATE.
DROP FUNCTION IF EXISTS public.ecommerce_imagenes_producto(integer);
CREATE FUNCTION public.ecommerce_imagenes_producto(_id_producto integer)
RETURNS TABLE (id bigint, url text, orden integer, color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pi.id, pi.url, pi.orden, pi.color
  FROM producto_imagenes pi
  JOIN productos p ON p.id = pi.id_producto
  WHERE pi.id_producto = _id_producto
    AND p.id_empresa = public.ecommerce_id_empresa()
    AND p.activo = true
  ORDER BY pi.orden ASC;
$$;
REVOKE ALL ON FUNCTION public.ecommerce_imagenes_producto(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ecommerce_imagenes_producto(integer) TO anon, authenticated, service_role;

-- Mismo cuerpo que en 20260910150000_oferta_pieza_y_ficha_joyeria +
-- id_combinacion en las líneas por cantidad.
CREATE OR REPLACE FUNCTION public.crear_venta_externa_piezas(_canal text, _id_orden_externa text, _id_tipo_comprobante integer, _serie text)
 RETURNS SETOF ventas
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_venta public.ventas%ROWTYPE;
    v_nro_comprobante text;
    v_pieza record;
    v_item record;
    v_precio_pieza numeric;
BEGIN
    IF _canal IS NULL OR _id_orden_externa IS NULL THEN
        RAISE EXCEPTION 'crear_venta_externa_piezas requiere _canal y _id_orden_externa';
    END IF;

    -- Lock de la fila: si dos webhooks (ej. reintento de Mercado Pago)
    -- llegan casi al mismo tiempo, el segundo espera a que el primero
    -- termine y después ve el estado ya actualizado (ver chequeo de abajo).
    SELECT * INTO v_venta FROM public.ventas
     WHERE origen = _canal AND id_orden_externa = _id_orden_externa
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una venta pendiente para % / % (crear-preferencia-pago debe crearla antes de confirmar)',
            _canal, _id_orden_externa;
    END IF;

    IF v_venta.estado = 'confirmada' THEN
        RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
        RETURN;
    END IF;

    -- Piezas de joyería ya reservadas para esta venta (reservar_pieza fue
    -- llamado desde crear-preferencia-pago). El trigger joyeria_detalle_venta_ai
    -- (AFTER INSERT existente) completa la reserva al ver id_pieza no nulo.
    FOR v_pieza IN
        SELECT id, id_producto, id_almacen, precio_venta, costo, precio_oferta
        FROM public.piezas_inventario
        WHERE id_venta_reserva = v_venta.id AND estado = 'reservada'
    LOOP
        v_precio_pieza := COALESCE(v_pieza.precio_oferta, v_pieza.precio_venta);
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, id_pieza, cantidad, precio_venta,
            precio_compra, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_pieza.id_producto, v_pieza.id, 1, v_precio_pieza,
            v_pieza.costo, v_precio_pieza, v_venta.id_sucursal, v_pieza.id_almacen
        );
    END LOOP;

    -- Productos por cantidad (no serializados): el trigger validarstock
    -- (AFTER... ya existente sobre detalle_venta) descuenta stock atómico,
    -- de la talla/color si la línea la trae.
    FOR v_item IN
        SELECT id_producto, id_almacen, id_combinacion, cantidad, precio_venta, precio_compra, descripcion
        FROM public.ecommerce_orden_items
        WHERE origen = _canal AND id_orden_externa = _id_orden_externa
    LOOP
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, id_combinacion, cantidad, precio_venta,
            precio_compra, descripcion, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_item.id_producto, v_item.id_combinacion, v_item.cantidad, v_item.precio_venta,
            v_item.precio_compra, v_item.descripcion,
            v_item.cantidad * v_item.precio_venta, v_venta.id_sucursal, v_item.id_almacen
        );
    END LOOP;

    -- El número de comprobante se genera recién acá (no al crear la
    -- preferencia): si el pago nunca se confirma, no se "quema" un número.
    SELECT public.generar_nro_comprobante(_id_tipo_comprobante, _serie, v_venta.id_sucursal::integer)
      INTO v_nro_comprobante;

    UPDATE public.ventas
       SET estado = 'confirmada', nro_comprobante = v_nro_comprobante
     WHERE id = v_venta.id;
    -- Dispara zzz_joyeria_ventas_confirmar_au (ya existente, AFTER UPDATE ON
    -- ventas): promueve a 'vendida' las piezas reservadas de esta venta.

    RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
END;
$function$;

-- Mismo cuerpo que en 20261001120000_seguridad_rls + talla/color en el nombre.
CREATE OR REPLACE FUNCTION public.admin_detalle_pedido_ecommerce(_id_venta bigint)
RETURNS TABLE (
  destinatario    text,
  telefono        text,
  email           text,
  cp              text,
  estado          text,
  municipio       text,
  colonia         text,
  calle           text,
  numero_exterior text,
  numero_interior text,
  entre_calles    text,
  referencias     text,
  items           jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.destinatario, e.telefono, e.email,
    e.cp, e.estado, e.municipio, e.colonia, e.calle,
    e.numero_exterior, e.numero_interior, e.entre_calles, e.referencias,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nombre', concat_ws(' · ', COALESCE(p.nombre, d.descripcion, 'Producto'),
                            NULLIF(pc.talla, ''), NULLIF(pc.color, '')),
        'cantidad', d.cantidad,
        'total', d.total
      ))
      FROM public.detalle_venta d
      LEFT JOIN public.productos p ON p.id = d.id_producto
      LEFT JOIN public.producto_combinaciones pc ON pc.id = d.id_combinacion
      WHERE d.id_venta = v.id
    ), '[]'::jsonb) AS items
  FROM public.ventas v
  LEFT JOIN public.ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
  WHERE v.id = _id_venta AND v.origen = 'ecommerce'
    AND admin_es_personal();
$$;

CREATE OR REPLACE FUNCTION public.ecommerce_catalogo(_f jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH par AS (
    SELECT
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(_f->'categorias', '[]'))::bigint) AS cats,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(_f->'marcas', '[]'))::bigint) AS marcas,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(_f->'etiquetas', '[]'))::bigint) AS etqs,
      ARRAY(SELECT lower(jsonb_array_elements_text(COALESCE(_f->'materiales', '[]')))) AS mats,
      -- {"<id_atributo>": [ids de valor], ...}; los vacíos no cuentan.
      (SELECT COALESCE(jsonb_object_agg(k, val), '{}'::jsonb)
         FROM jsonb_each(CASE WHEN jsonb_typeof(_f->'atributos') = 'object'
                              THEN _f->'atributos' ELSE '{}'::jsonb END) AS e(k, val)
        WHERE jsonb_typeof(val) = 'array' AND jsonb_array_length(val) > 0) AS atr,
      NULLIF(btrim(_f->>'buscador'), '') AS q,
      NULLIF(btrim(_f->>'talla'), '') AS talla,
      ARRAY(SELECT lower(jsonb_array_elements_text(COALESCE(_f->'colores', '[]')))) AS cols,
      (_f->>'precio_min')::numeric AS pmin,
      (_f->>'precio_max')::numeric AS pmax,
      (_f->>'peso_min')::numeric AS gmin,
      (_f->>'peso_max')::numeric AS gmax,
      COALESCE((_f->>'solo_disponibles')::boolean, false) AS disp,
      COALESCE((_f->>'en_oferta')::boolean, false) AS oferta,
      COALESCE(_f->>'orden', 'destacados') AS orden,
      GREATEST(COALESCE((_f->>'pagina')::int, 1), 1) AS pagina,
      LEAST(GREATEST(COALESCE((_f->>'tam_pagina')::int, 24), 1), 100) AS tam
  ),
  vendidos AS (
    SELECT dv.id_producto,
           sum(CASE WHEN dv.id_pieza IS NOT NULL THEN 1 ELSE dv.cantidad END) AS n
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.id_venta
     WHERE v.estado = 'confirmada'
       AND v.id_empresa = ecommerce_id_empresa()
       AND v.fecha >= (now() - interval '90 days')::timestamp
     GROUP BY dv.id_producto
  ),
  top AS (
    SELECT id_producto FROM vendidos WHERE n > 0 ORDER BY n DESC, id_producto LIMIT 5
  ),
  prod AS (
    SELECT
      p.id, p.nombre, p.descripcion, p.precio_venta, p.id_categoria,
      c.nombre AS categoria, c.id_padre AS id_categoria_padre,
      p.es_joyeria, p.destacado, p.id_marca, p.created_at,
      p.tallas,
      -- Tallas y colores (Fase C): solo los que tienen existencia.
      EXISTS (SELECT 1 FROM producto_combinaciones pc
               WHERE pc.id_producto = p.id AND pc.activo) AS con_comb,
      ARRAY(SELECT DISTINCT pc.talla FROM producto_combinaciones pc
              JOIN stock s ON s.id_combinacion = pc.id
             WHERE pc.id_producto = p.id AND pc.activo AND pc.talla <> ''
               AND s.stock > 0) AS tallas_disp,
      ARRAY(SELECT DISTINCT lower(pc.color) FROM producto_combinaciones pc
              JOIN stock s ON s.id_combinacion = pc.id
             WHERE pc.id_producto = p.id AND pc.activo AND pc.color <> ''
               AND s.stock > 0) AS colores_disp,
      (SELECT pi.url FROM producto_imagenes pi
        WHERE pi.id_producto = p.id ORDER BY pi.orden ASC LIMIT 1) AS imagen_portada,
      CASE
        WHEN p.es_joyeria THEN (
          SELECT count(*)::numeric FROM piezas_inventario pz
           WHERE pz.id_producto = p.id AND pz.estado = 'disponible')
        WHEN p.maneja_inventarios THEN (
          SELECT COALESCE(sum(s.stock), 0) FROM stock s WHERE s.id_producto = p.id)
        ELSE NULL
      END AS total_disponible,
      CASE
        WHEN p.precio_oferta IS NOT NULL
         AND (p.oferta_desde IS NULL OR now() >= p.oferta_desde)
         AND (p.oferta_hasta IS NULL OR now() <= p.oferta_hasta)
        THEN p.precio_oferta
      END AS precio_oferta,
      (SELECT m.nombre FROM marca m WHERE m.id = p.id_marca) AS marca,
      ARRAY(SELECT pe.id_etiqueta FROM producto_etiquetas pe
             WHERE pe.id_producto = p.id) AS ids_etiqueta,
      COALESCE((SELECT array_agg(e.nombre ORDER BY e.nombre)
                  FROM producto_etiquetas pe JOIN etiquetas e ON e.id = pe.id_etiqueta
                 WHERE pe.id_producto = p.id), '{}') AS etiquetas,
      ARRAY(SELECT pa.id_valor FROM producto_atributos pa
             WHERE pa.id_producto = p.id) AS ids_valor,
      ARRAY(SELECT DISTINCT lower(v.material) FROM producto_variantes v
             WHERE v.id_producto = p.id AND v.material IS NOT NULL) AS materiales,
      COALESCE(vd.n, 0) AS vendidos,
      EXISTS (SELECT 1 FROM top t WHERE t.id_producto = p.id) AS mas_vendido
    FROM productos p
    JOIN categorias c ON c.id = p.id_categoria
    LEFT JOIN vendidos vd ON vd.id_producto = p.id
    WHERE p.id_empresa = ecommerce_id_empresa()
      AND p.activo = true AND p.visible_ecommerce
  ),
  m1 AS (
    SELECT pr.*, par.atr,
      NULLIF(COALESCE(pr.precio_oferta, pr.precio_venta), 0) AS precio_final,
      -- Un padre elegido incluye a sus subcategorías.
      (cardinality(par.cats) = 0 OR pr.id_categoria = ANY (par.cats)
       OR pr.id_categoria_padre = ANY (par.cats)) AS m_cat,
      (cardinality(par.marcas) = 0 OR pr.id_marca = ANY (par.marcas)) AS m_marca,
      (cardinality(par.etqs) = 0 OR pr.ids_etiqueta && par.etqs) AS m_etq,
      (cardinality(par.mats) = 0 OR pr.materiales && par.mats) AS m_mat,
      -- Cada atributo elegido se exige; dentro de él basta un valor.
      NOT EXISTS (
        SELECT 1 FROM jsonb_each(par.atr) AS e(k, val)
         WHERE NOT pr.ids_valor && ARRAY(SELECT jsonb_array_elements_text(val)::bigint)
      ) AS m_atr,
      (NOT par.oferta OR pr.precio_oferta IS NOT NULL) AS m_oferta,
      ((par.pmin IS NULL OR COALESCE(pr.precio_oferta, pr.precio_venta) >= par.pmin)
       AND (par.pmax IS NULL OR COALESCE(pr.precio_oferta, pr.precio_venta) <= par.pmax)) AS m_precio,
      (
        (par.q IS NULL
          OR pr.nombre ILIKE '%' || par.q || '%'
          OR pr.descripcion ILIKE '%' || par.q || '%'
          OR pr.tallas ILIKE '%' || par.q || '%'
          OR EXISTS (SELECT 1 FROM unnest(pr.colores_disp) AS col
                      WHERE col ILIKE '%' || par.q || '%')
          OR EXISTS (SELECT 1 FROM piezas_inventario pz
                      WHERE pz.id_producto = pr.id AND pz.sku ILIKE '%' || par.q || '%'))
        AND ((par.gmin IS NULL AND par.gmax IS NULL) OR EXISTS (
              SELECT 1 FROM piezas_inventario pz
               WHERE pz.id_producto = pr.id
                 AND (par.gmin IS NULL OR pz.peso >= par.gmin)
                 AND (par.gmax IS NULL OR pz.peso <= par.gmax)))
        AND (NOT par.disp OR COALESCE(pr.total_disponible, 1) > 0)
      ) AS m_resto0,
      -- Con tallas y colores cuentan las que tienen existencia; sin ellos,
      -- la talla de la pieza o el texto de tallas del producto.
      (par.talla IS NULL
        OR (pr.con_comb AND EXISTS (SELECT 1 FROM unnest(pr.tallas_disp) AS t
                                     WHERE t ILIKE par.talla))
        OR (NOT pr.con_comb
            AND (EXISTS (SELECT 1 FROM piezas_inventario pz
                          WHERE pz.id_producto = pr.id AND pz.talla ILIKE par.talla)
                 OR pr.tallas ILIKE '%' || par.talla || '%'))) AS m_talla,
      (cardinality(par.cols) = 0 OR pr.colores_disp && par.cols) AS m_color
    FROM prod pr, par
  ),
  m AS (
    SELECT m1.*, (m_resto0 AND m_talla AND m_color) AS m_resto FROM m1
  ),
  todos AS (
    SELECT * FROM m
     WHERE m_cat AND m_marca AND m_etq AND m_mat AND m_atr AND m_oferta AND m_precio AND m_resto
  ),
  pagina AS (
    SELECT t.* FROM todos t, par
     ORDER BY
       CASE WHEN par.orden = 'destacados' THEN t.destacado END DESC NULLS LAST,
       CASE WHEN par.orden IN ('destacados', 'vendidos') THEN t.vendidos END DESC NULLS LAST,
       CASE WHEN par.orden = 'nuevos' THEN t.created_at END DESC NULLS LAST,
       CASE WHEN par.orden = 'precio_asc' THEN t.precio_final END ASC NULLS LAST,
       CASE WHEN par.orden = 'precio_desc' THEN t.precio_final END DESC NULLS LAST,
       t.nombre ASC, t.id ASC
     LIMIT (SELECT tam FROM par)
    OFFSET (SELECT (pagina - 1) * tam FROM par)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM todos),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.id, 'nombre', p.nombre, 'descripcion', p.descripcion,
               'precio_venta', p.precio_venta, 'id_categoria', p.id_categoria,
               'categoria', p.categoria, 'es_joyeria', p.es_joyeria,
               'imagen_portada', p.imagen_portada, 'total_disponible', p.total_disponible,
               'destacado', p.destacado, 'precio_oferta', p.precio_oferta,
               'marca', p.marca, 'etiquetas', p.etiquetas,
               'es_nuevo', p.created_at >= now() - interval '30 days',
               'mas_vendido', p.mas_vendido))
        FROM pagina p), '[]'::jsonb),
    'facetas', jsonb_build_object(
      -- Las que tienen productos (propios o de sus hijas); el conteo de un
      -- padre suma el de sus hijas.
      'categorias', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre,
                                            'id_padre', id_padre, 'n', n)
                         ORDER BY nombre)
          FROM (SELECT c.id, c.nombre, c.id_padre,
                       count(m.id) FILTER (WHERE m.m_marca AND m.m_etq AND m.m_mat AND m.m_atr
                                             AND m.m_oferta AND m.m_precio AND m.m_resto) AS n
                  FROM categorias c
                  JOIN m ON m.id_categoria = c.id OR m.id_categoria_padre = c.id
                 WHERE c.id_empresa = ecommerce_id_empresa()
                 GROUP BY c.id, c.nombre, c.id_padre) x), '[]'::jsonb),
      'marcas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id_marca, 'nombre', marca, 'n', n)
                         ORDER BY marca)
          FROM (SELECT id_marca, marca,
                       count(*) FILTER (WHERE m_cat AND m_etq AND m_mat AND m_atr
                                          AND m_oferta AND m_precio AND m_resto) AS n
                  FROM m WHERE id_marca IS NOT NULL GROUP BY id_marca, marca) x), '[]'::jsonb),
      'etiquetas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'n', n)
                         ORDER BY nombre)
          FROM (SELECT e.id, e.nombre,
                       count(*) FILTER (WHERE m.m_cat AND m.m_marca AND m.m_mat AND m.m_atr
                                          AND m.m_oferta AND m.m_precio AND m.m_resto) AS n
                  FROM m
                  JOIN etiquetas e ON e.id = ANY (m.ids_etiqueta)
                 GROUP BY e.id, e.nombre) x), '[]'::jsonb),
      'materiales', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('valor', valor, 'nombre', initcap(valor), 'n', n)
                         ORDER BY valor)
          FROM (SELECT mat AS valor,
                       count(*) FILTER (WHERE m.m_cat AND m.m_marca AND m.m_etq AND m.m_atr
                                          AND m.m_oferta AND m.m_precio AND m.m_resto) AS n
                  FROM m, unnest(m.materiales) AS mat
                 GROUP BY mat) x), '[]'::jsonb),
      'en_oferta', (SELECT count(*) FROM m
                     WHERE m_cat AND m_marca AND m_etq AND m_mat AND m_atr AND m_precio
                       AND m_resto AND precio_oferta IS NOT NULL),
      -- Por atributo, con los demás atributos elegidos aplicados pero no el
      -- suyo. Solo los atributos con algún valor usado en la tienda.
      'atributos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre, 'valores', x.vals)
                         ORDER BY a.orden, a.nombre)
          FROM atributos a
          CROSS JOIN LATERAL (
            SELECT jsonb_agg(jsonb_build_object('id', av.id, 'nombre', av.nombre, 'n', (
                     SELECT count(*) FROM m
                      WHERE av.id = ANY (m.ids_valor)
                        AND m.m_cat AND m.m_marca AND m.m_etq AND m.m_mat AND m.m_oferta
                        AND m.m_precio AND m.m_resto
                        AND NOT EXISTS (
                          SELECT 1 FROM jsonb_each(m.atr) AS e(k, val)
                           WHERE e.k <> a.id::text
                             AND NOT m.ids_valor && ARRAY(SELECT jsonb_array_elements_text(val)::bigint))
                   )) ORDER BY av.orden, av.nombre) AS vals
              FROM atributo_valores av
             WHERE av.id_atributo = a.id
          ) x
         WHERE a.id_empresa = ecommerce_id_empresa()
           AND EXISTS (SELECT 1 FROM atributo_valores av
                         JOIN m ON av.id = ANY (m.ids_valor)
                        WHERE av.id_atributo = a.id)), '[]'::jsonb),
      -- Tallas y colores con existencia, con todos los demás filtros aplicados
      -- menos el suyo. Tallas de ropa en su orden (XS…XXL), luego números.
      'tallas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('valor', t, 'n', n)
                         ORDER BY CASE upper(t) WHEN 'XXS' THEN 1 WHEN 'XS' THEN 2
                                    WHEN 'S' THEN 3 WHEN 'M' THEN 4 WHEN 'L' THEN 5
                                    WHEN 'XL' THEN 6 WHEN 'XXL' THEN 7 WHEN 'XXXL' THEN 8
                                    ELSE 100 END,
                                  CASE WHEN t ~ '^[0-9]+([.][0-9]+)?$' THEN t::numeric END,
                                  t)
          FROM (SELECT t, count(*) AS n
                  FROM m, unnest(m.tallas_disp) AS t
                 WHERE m.m_cat AND m.m_marca AND m.m_etq AND m.m_mat AND m.m_atr
                   AND m.m_oferta AND m.m_precio AND m.m_resto0 AND m.m_color
                 GROUP BY t) x), '[]'::jsonb),
      'colores', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('valor', valor, 'n', n,
                 'nombre', (SELECT pc.color FROM producto_combinaciones pc
                              JOIN productos p ON p.id = pc.id_producto
                             WHERE lower(pc.color) = x.valor
                               AND p.id_empresa = ecommerce_id_empresa() LIMIT 1),
                 'hex', (SELECT pc.color_hex FROM producto_combinaciones pc
                           JOIN productos p ON p.id = pc.id_producto
                          WHERE lower(pc.color) = x.valor AND pc.color_hex IS NOT NULL
                            AND p.id_empresa = ecommerce_id_empresa() LIMIT 1))
                         ORDER BY valor)
          FROM (SELECT col AS valor, count(*) AS n
                  FROM m, unnest(m.colores_disp) AS col
                 WHERE m.m_cat AND m.m_marca AND m.m_etq AND m.m_mat AND m.m_atr
                   AND m.m_oferta AND m.m_precio AND m.m_resto0 AND m.m_talla
                 GROUP BY col) x), '[]'::jsonb),
      'precio', (SELECT jsonb_build_object('min', min(precio_final), 'max', max(precio_final))
                   FROM m)
    )
  );
$$;

