-- Subcategorías: una categoría puede tener una categoría padre (un solo
-- nivel: Ropa → Playeras). Al borrar el padre, sus hijas quedan sueltas.
--
-- Reglas (trigger): el padre es de la misma empresa y no tiene padre; una
-- categoría con hijas no puede volverse hija.
--
-- Tienda:
--   * ecommerce_listar_categorias solo devuelve las de primer nivel (las
--     tarjetas del inicio).
--   * ecommerce_catalogo: filtrar por un padre incluye los productos de sus
--     hijas; la faceta de categorías trae id_padre y el conteo del padre suma
--     el de sus hijas. Mismo cuerpo que en 20261027120000 + subcategorías.

ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS id_padre bigint
    REFERENCES public.categorias(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorias_padre_distinto') THEN
    ALTER TABLE public.categorias
      ADD CONSTRAINT categorias_padre_distinto CHECK (id_padre IS DISTINCT FROM id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS categorias_id_padre_idx ON public.categorias (id_padre);

CREATE OR REPLACE FUNCTION public.categorias_validar_padre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  padre categorias%ROWTYPE;
BEGIN
  IF NEW.id_padre IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO padre FROM categorias WHERE id = NEW.id_padre;
  IF NOT FOUND OR padre.id_empresa IS DISTINCT FROM NEW.id_empresa THEN
    RAISE EXCEPTION 'La categoría padre no existe' USING ERRCODE = '23503';
  END IF;
  IF padre.id_padre IS NOT NULL THEN
    RAISE EXCEPTION 'Solo hay un nivel de subcategorías: "%" ya es subcategoría', padre.nombre
      USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM categorias WHERE id_padre = NEW.id) THEN
    RAISE EXCEPTION '"%" tiene subcategorías, no puede ser subcategoría', NEW.nombre
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categorias_validar_padre ON public.categorias;
CREATE TRIGGER categorias_validar_padre
  BEFORE INSERT OR UPDATE OF id_padre ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.categorias_validar_padre();

-- Mismo cuerpo que en 20260903200000_ecommerce_catalogo_rpc.sql + solo las
-- de primer nivel.
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
    AND c.id_padre IS NULL
  ORDER BY c.nombre;
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
  m AS (
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
      'precio', (SELECT jsonb_build_object('min', min(precio_final), 'max', max(precio_final))
                   FROM m)
    )
  );
$$;

