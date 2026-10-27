-- Catálogo de la tienda con orden, filtros de varias opciones y conteos por
-- opción (como las tiendas grandes). Una sola llamada devuelve:
--   { "total": n,
--     "items": [ {...producto, es_nuevo, mas_vendido} ],
--     "facetas": { categorias, marcas, etiquetas, materiales: [{id|valor, nombre, n}],
--                  en_oferta: n, precio: {min, max} } }
-- precio = mínimo y máximo de toda la tienda (sin filtros), para armar
-- rangos que no cambien al ir filtrando.
--
-- _f (todo opcional):
--   categorias, marcas, etiquetas: [ids]   materiales: [texto]
--   buscador, talla: texto   precio_min, precio_max, peso_min, peso_max: número
--   solo_disponibles, en_oferta: bool
--   orden: destacados | nuevos | precio_asc | precio_desc | vendidos
--   pagina, tam_pagina (máx. 100)
--
-- Dentro de un mismo filtro las opciones se suman (Oro O Plata); entre
-- filtros distintos se exigen todas. El conteo de cada opción se calcula con
-- los demás filtros aplicados pero no el suyo, para que elegir "Oro" no
-- deje a "Plata" en 0.
--
-- El precio que se filtra y ordena es el que paga el cliente: la oferta si
-- está vigente. Precio 0 ("Consultar precio") queda al final al ordenar.
-- "Nuevo" = dado de alta hace 30 días o menos; "Más vendido" = los 5 con más
-- unidades vendidas (ventas confirmadas) en los últimos 90 días.
--
-- ecommerce_listar_productos se queda para la vitrina del inicio.

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
      NULLIF(btrim(_f->>'buscador'), '') AS q,
      NULLIF(btrim(_f->>'talla'), '') AS talla,
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
      c.nombre AS categoria, p.es_joyeria, p.destacado, p.id_marca, p.created_at,
      p.tallas,
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
  m AS (
    SELECT pr.*,
      NULLIF(COALESCE(pr.precio_oferta, pr.precio_venta), 0) AS precio_final,
      (cardinality(par.cats) = 0 OR pr.id_categoria = ANY (par.cats)) AS m_cat,
      (cardinality(par.marcas) = 0 OR pr.id_marca = ANY (par.marcas)) AS m_marca,
      (cardinality(par.etqs) = 0 OR pr.ids_etiqueta && par.etqs) AS m_etq,
      (cardinality(par.mats) = 0 OR pr.materiales && par.mats) AS m_mat,
      (NOT par.oferta OR pr.precio_oferta IS NOT NULL) AS m_oferta,
      ((par.pmin IS NULL OR COALESCE(pr.precio_oferta, pr.precio_venta) >= par.pmin)
       AND (par.pmax IS NULL OR COALESCE(pr.precio_oferta, pr.precio_venta) <= par.pmax)) AS m_precio,
      (
        (par.q IS NULL
          OR pr.nombre ILIKE '%' || par.q || '%'
          OR pr.descripcion ILIKE '%' || par.q || '%'
          OR pr.tallas ILIKE '%' || par.q || '%'
          OR EXISTS (SELECT 1 FROM piezas_inventario pz
                      WHERE pz.id_producto = pr.id AND pz.sku ILIKE '%' || par.q || '%'))
        AND ((par.gmin IS NULL AND par.gmax IS NULL) OR EXISTS (
              SELECT 1 FROM piezas_inventario pz
               WHERE pz.id_producto = pr.id
                 AND (par.gmin IS NULL OR pz.peso >= par.gmin)
                 AND (par.gmax IS NULL OR pz.peso <= par.gmax)))
        AND (par.talla IS NULL
          OR EXISTS (SELECT 1 FROM piezas_inventario pz
                      WHERE pz.id_producto = pr.id AND pz.talla ILIKE par.talla)
          OR pr.tallas ILIKE '%' || par.talla || '%')
        AND (NOT par.disp OR COALESCE(pr.total_disponible, 1) > 0)
      ) AS m_resto
    FROM prod pr, par
  ),
  todos AS (
    SELECT * FROM m
     WHERE m_cat AND m_marca AND m_etq AND m_mat AND m_oferta AND m_precio AND m_resto
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
      'categorias', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id_categoria, 'nombre', categoria, 'n', n)
                         ORDER BY categoria)
          FROM (SELECT id_categoria, categoria,
                       count(*) FILTER (WHERE m_marca AND m_etq AND m_mat AND m_oferta
                                          AND m_precio AND m_resto) AS n
                  FROM m GROUP BY id_categoria, categoria) x), '[]'::jsonb),
      'marcas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id_marca, 'nombre', marca, 'n', n)
                         ORDER BY marca)
          FROM (SELECT id_marca, marca,
                       count(*) FILTER (WHERE m_cat AND m_etq AND m_mat AND m_oferta
                                          AND m_precio AND m_resto) AS n
                  FROM m WHERE id_marca IS NOT NULL GROUP BY id_marca, marca) x), '[]'::jsonb),
      'etiquetas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'n', n)
                         ORDER BY nombre)
          FROM (SELECT e.id, e.nombre,
                       count(*) FILTER (WHERE m.m_cat AND m.m_marca AND m.m_mat AND m.m_oferta
                                          AND m.m_precio AND m.m_resto) AS n
                  FROM m
                  JOIN etiquetas e ON e.id = ANY (m.ids_etiqueta)
                 GROUP BY e.id, e.nombre) x), '[]'::jsonb),
      'materiales', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('valor', valor, 'nombre', initcap(valor), 'n', n)
                         ORDER BY valor)
          FROM (SELECT mat AS valor,
                       count(*) FILTER (WHERE m.m_cat AND m.m_marca AND m.m_etq AND m.m_oferta
                                          AND m.m_precio AND m.m_resto) AS n
                  FROM m, unnest(m.materiales) AS mat
                 GROUP BY mat) x), '[]'::jsonb),
      'en_oferta', (SELECT count(*) FROM m
                     WHERE m_cat AND m_marca AND m_etq AND m_mat AND m_precio AND m_resto
                       AND precio_oferta IS NOT NULL),
      'precio', (SELECT jsonb_build_object('min', min(precio_final), 'max', max(precio_final))
                   FROM m)
    )
  );
$$;

REVOKE ALL ON FUNCTION public.ecommerce_catalogo(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ecommerce_catalogo(jsonb) TO anon, authenticated, service_role;
