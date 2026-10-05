-- ============================================================================
-- Seguridad: el costo solo lo ve quien tiene el módulo "Ver costos".
--
-- Antes, todo el personal (cajero incluido) podía leer por REST el costo de
-- piezas y productos, aunque la app no se lo mostrara. Ahora:
--   * Nuevo módulo "Ver costos" (se marca en Personal). Gerente (superadmin
--     o admin, ver 20261005120000_roles_finos.sql) lo tiene siempre.
--   * El rol `authenticated` ya no puede leer las columnas de costo
--     (privilegios por columna). La app lee esas tablas a través de vistas
--     *_v que devuelven el costo en NULL a quien no tiene el módulo.
--   * Quien no ve costos SÍ puede capturarlo al dar de alta, pero al editar
--     el costo se queda como estaba (trigger conservar_costo).
--   * Al vender, el costo de la línea lo pone la base (de la pieza o del
--     producto); ya no depende de que el POS lo conozca.
--
-- OJO para migraciones futuras: en productos, producto_variantes,
-- piezas_inventario, detalle_venta, kardex y ecommerce_orden_items el SELECT
-- de `authenticated` es por columna. Una columna nueva necesita su propio
-- `GRANT SELECT (columna) ON tabla TO authenticated` y agregarse a la vista
-- *_v correspondiente.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Módulo y helper.
-- ----------------------------------------------------------------------------
INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Ver costos', 'ver costos de compra y ganancias',
       'https://i.ibb.co/85zJ6yG/caja-del-paquete.png',
       '#ver-costos', '#permiso'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE nombre = 'Ver costos');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id, m.id
  FROM public.usuarios u
  JOIN public.roles r ON r.id = u.id_rol AND r.nombre IN ('superadmin', 'admin')
 CROSS JOIN public.modulos m
 WHERE m.nombre = 'Ver costos'
   AND NOT EXISTS (SELECT 1 FROM public.permisos p
                    WHERE p.id_usuario = u.id AND p.idmodulo = m.id);

CREATE OR REPLACE FUNCTION public.admin_ve_costos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT admin_es_gerente()
      OR EXISTS (
        SELECT 1
          FROM usuarios u
          JOIN permisos p ON p.id_usuario = u.id
          JOIN modulos m  ON m.id = p.idmodulo
         WHERE u.id_auth = auth.uid()::text
           AND u.estado = 'ACTIVO'
           AND m.nombre = 'Ver costos'
      );
$$;
REVOKE ALL ON FUNCTION public.admin_ve_costos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ve_costos() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Vistas con el costo enmascarado. Corren con los permisos del dueño (no les
-- aplica RLS ni el privilegio por columna), así que repiten el filtro de
-- personal. `(SELECT f())` para evaluar una vez por consulta.
-- ----------------------------------------------------------------------------
CREATE VIEW public.productos_v WITH (security_barrier) AS
SELECT id, nombre, precio_venta,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra END AS precio_compra,
       id_categoria, codigo_barras, codigo_interno, id_empresa, sevende_por,
       maneja_inventarios, maneja_multiprecios, id_marca, descripcion,
       es_joyeria, created_at, updated_at, activo, destacado, precio_oferta,
       oferta_desde, oferta_hasta, medidas, tallas
  FROM public.productos
 WHERE (SELECT admin_es_personal());

CREATE VIEW public.producto_variantes_v WITH (security_barrier) AS
SELECT id, id_producto, id_empresa, material, pureza, sku_prefijo,
       ultimo_correlativo, precio_venta_sugerido,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra_sugerido END AS precio_compra_sugerido,
       notas, created_at, updated_at
  FROM public.producto_variantes
 WHERE (SELECT admin_es_personal());

CREATE VIEW public.piezas_inventario_v WITH (security_barrier) AS
SELECT id, id_variante, id_producto, id_empresa, id_almacen, sku, barcode,
       peso,
       CASE WHEN (SELECT admin_ve_costos()) THEN costo END AS costo,
       precio_venta, estado, id_detalle_venta, id_venta_reserva, nota,
       created_at, updated_at, talla, precio_oferta, medidas, id_grupo
  FROM public.piezas_inventario
 WHERE (SELECT admin_es_personal());

CREATE VIEW public.detalle_venta_v WITH (security_barrier) AS
SELECT id, id_venta, cantidad, precio_venta, total, descripcion, id_producto,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra END AS precio_compra,
       id_sucursal, estado, id_almacen, id_pieza
  FROM public.detalle_venta
 WHERE (SELECT admin_es_personal());

DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['productos_v', 'producto_variantes_v',
                           'piezas_inventario_v', 'detalle_venta_v']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated, service_role', v);
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- authenticated: SELECT de todas las columnas menos las de costo.
-- (INSERT/UPDATE siguen a nivel tabla: capturar costo sí se puede.)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  cols text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('productos',             ARRAY['precio_compra']),
      ('producto_variantes',    ARRAY['precio_compra_sugerido']),
      ('piezas_inventario',     ARRAY['costo']),
      ('detalle_venta',         ARRAY['precio_compra']),
      ('kardex',                ARRAY['costo']),
      ('ecommerce_orden_items', ARRAY['precio_compra'])
    ) AS t(tabla, ocultas)
  LOOP
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = r.tabla
       AND column_name <> ALL (r.ocultas);
    EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', r.tabla);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, r.tabla);
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- Quien no ve costos no los puede cambiar: al editar, el costo se queda
-- como estaba (aunque el formulario mande vacío o cualquier cosa).
-- Sin sesión (service_role, cron, SQL editor) no se toca nada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.conservar_costo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  col text := TG_ARGV[0];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT admin_ve_costos() THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object(col, to_jsonb(OLD) -> col));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER conservar_costo BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.conservar_costo('precio_compra');
CREATE TRIGGER conservar_costo BEFORE UPDATE ON public.producto_variantes
  FOR EACH ROW EXECUTE FUNCTION public.conservar_costo('precio_compra_sugerido');
CREATE TRIGGER conservar_costo BEFORE UPDATE ON public.piezas_inventario
  FOR EACH ROW EXECUTE FUNCTION public.conservar_costo('costo');
CREATE TRIGGER conservar_costo BEFORE UPDATE ON public.detalle_venta
  FOR EACH ROW EXECUTE FUNCTION public.conservar_costo('precio_compra');

-- Al vender desde el admin, el costo de la línea sale de la pieza o del
-- producto (el POS de un cajero ya no lo conoce). Las ventas externas
-- (Mercado Pago / Mercado Libre, sin sesión) mandan el suyo.
CREATE OR REPLACE FUNCTION public.detalle_venta_costo_bi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id_pieza IS NOT NULL THEN
    SELECT costo INTO c FROM piezas_inventario WHERE id = NEW.id_pieza;
  ELSE
    SELECT precio_compra INTO c FROM productos WHERE id = NEW.id_producto;
  END IF;
  NEW.precio_compra := COALESCE(c, NEW.precio_compra);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.detalle_venta_costo_bi() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER detalle_venta_costo_bi BEFORE INSERT ON public.detalle_venta
  FOR EACH ROW EXECUTE FUNCTION public.detalle_venta_costo_bi();


-- ----------------------------------------------------------------------------
-- Funciones que leen filas completas de piezas (SELECT * / rowtype): pasan a
-- SECURITY DEFINER. Ya exigen el módulo (crear/ajustar) o las dispara un
-- DELETE que RLS ya autorizó (trigger de detalle_venta).
-- ajustar_pieza además dejaba el costo anterior/nuevo en las notas del
-- historial de la pieza, que ve todo el personal: se quita de las notas.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  def text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('ajustar_pieza', 'crear_piezas_masivo', 'joyeria_detalle_venta_ad')
  LOOP
    IF r.proname = 'ajustar_pieza' THEN
      def := pg_get_functiondef(r.oid);
      def := replace(def, 'costo %s->%s, ', '');
      def := regexp_replace(def, 'v_ant\.costo, coalesce\(_costo, v_ant\.costo\),\s*', '', 'g');
      EXECUTE def;
    END IF;
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', r.oid::regprocedure);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.oid::regprocedure);
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- RPC de lectura que devuelven costo: leen de las vistas (costo enmascarado).
-- Mismo cuerpo que antes salvo la tabla de origen.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_buscar_pieza(_codigo text, _id_empresa integer)
 RETURNS TABLE(id_pieza bigint, id_variante bigint, id_producto bigint, producto text, categoria text, material text, pureza text, sku text, barcode text, peso numeric, costo numeric, precio_venta numeric, estado text, id_almacen bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT pi.id, pi.id_variante, pi.id_producto,
         p.nombre, c.nombre, v.material, v.pureza,
         pi.sku, pi.barcode, pi.peso, pi.costo, pi.precio_venta, pi.estado, pi.id_almacen
    FROM piezas_inventario_v pi
    JOIN producto_variantes v ON v.id = pi.id_variante
    JOIN productos p          ON p.id = pi.id_producto
    LEFT JOIN categorias c    ON c.id = p.id_categoria
   WHERE pi.id_empresa = _id_empresa
     AND (lower(pi.barcode) = lower(btrim(_codigo))
          OR lower(pi.sku) = lower(btrim(_codigo)))
   LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.pos_buscar_piezas_texto(_id_empresa integer, _buscador text)
 RETURNS TABLE(id_pieza bigint, id_variante bigint, id_producto bigint, producto text, categoria text, material text, pureza text, sku text, barcode text, peso numeric, costo numeric, precio_venta numeric, estado text, id_almacen bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT pi.id, pi.id_variante, pi.id_producto,
         p.nombre, c.nombre, v.material, v.pureza,
         pi.sku, pi.barcode, pi.peso, pi.costo, pi.precio_venta, pi.estado, pi.id_almacen
    FROM piezas_inventario_v pi
    JOIN producto_variantes v ON v.id = pi.id_variante
    JOIN productos p          ON p.id = pi.id_producto
    LEFT JOIN categorias c    ON c.id = p.id_categoria
   WHERE pi.id_empresa = _id_empresa
     AND pi.estado = 'disponible'
     AND (LOWER(p.nombre) LIKE '%' || LOWER(_buscador) || '%'
          OR LOWER(pi.sku) LIKE '%' || LOWER(_buscador) || '%'
          OR LOWER(pi.barcode) LIKE '%' || LOWER(_buscador) || '%')
   ORDER BY p.nombre ASC
   LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.joyeria_inventario_listado(_id_empresa integer)
 RETURNS TABLE(id_categoria bigint, categoria text, id_producto bigint, producto text, id_marca bigint, id_variante bigint, material text, pureza text, sku_prefijo text, id_pieza bigint, sku text, barcode text, peso numeric, costo numeric, precio_venta numeric, precio_oferta numeric, talla text, medidas text, estado text, id_almacen bigint, almacen text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT c.id, c.nombre,
         p.id, p.nombre, p.id_marca,
         v.id, v.material, v.pureza, v.sku_prefijo,
         pi.id, pi.sku, pi.barcode,
         pi.peso, pi.costo, pi.precio_venta, pi.precio_oferta, pi.talla,
         pi.medidas,
         pi.estado,
         pi.id_almacen, a.nombre,
         pi.created_at
    FROM piezas_inventario_v pi
    JOIN producto_variantes v ON v.id = pi.id_variante
    JOIN productos p          ON p.id = pi.id_producto
    LEFT JOIN categorias c    ON c.id = p.id_categoria
    LEFT JOIN almacen a       ON a.id = pi.id_almacen
   WHERE pi.id_empresa = _id_empresa
   ORDER BY c.nombre, p.nombre, v.material, v.pureza, pi.id;
$function$;

CREATE OR REPLACE FUNCTION public.buscarproductos(_id_empresa integer, buscador text)
 RETURNS TABLE(id integer, nombre text, precio_venta numeric, precio_compra numeric, id_categoria integer, sevende_por text, codigo_barras text, codigo_interno text, id_empresa integer, maneja_inventarios boolean, maneja_multiprecios boolean, p_venta text, p_compra text, categoria text, imagen_portada text)
 LANGUAGE sql
AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 CASE WHEN p.precio_compra IS NOT NULL
      THEN concat(e.simbolo_moneda, ' ', p.precio_compra) END as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada
  from productos_v as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE
    ORDER BY p.nombre ASC
    LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.buscarproductoslectora(_id_empresa integer, buscador text)
 RETURNS TABLE(id integer, nombre text, precio_venta numeric, precio_compra numeric, id_categoria integer, sevende_por text, codigo_barras text, codigo_interno text, id_empresa integer, maneja_inventarios boolean, maneja_multiprecios boolean, p_venta text, p_compra text, categoria text, imagen_portada text)
 LANGUAGE sql
AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 CASE WHEN p.precio_compra IS NOT NULL
      THEN concat(e.simbolo_moneda, ' ', p.precio_compra) END as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada
  from productos_v as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where
    ( LOWER(p.codigo_barras) = LOWER(buscador)
    OR LOWER(p.codigo_interno) = LOWER(buscador))
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.mostrarproductos(_id_empresa integer)
 RETURNS TABLE(id integer, nombre text, precio_venta numeric, precio_compra numeric, id_categoria integer, sevende_por text, codigo_barras text, codigo_interno text, id_empresa integer, maneja_inventarios boolean, maneja_multiprecios boolean, p_venta text, p_compra text, categoria text, imagen_portada text, destacado boolean, precio_oferta numeric, oferta_desde timestamp with time zone, oferta_hasta timestamp with time zone, id_marca bigint, medidas text, tallas text)
 LANGUAGE sql
AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 CASE WHEN p.precio_compra IS NOT NULL
      THEN concat(e.simbolo_moneda, ' ', p.precio_compra) END as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada,
 p.destacado, p.precio_oferta, p.oferta_desde, p.oferta_hasta,
 p.id_marca, p.medidas, p.tallas
  from productos_v as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where p.id_empresa = _id_empresa and p.activo;
$function$;

CREATE OR REPLACE FUNCTION public.report_stock_por_almacen_sucursal(_id_empresa integer, sucursal_id integer DEFAULT NULL::integer, almacen_id integer DEFAULT NULL::integer)
 RETURNS TABLE(codigo_articulo text, descripcion_articulo text, stock numeric, precio_costo numeric, total numeric)
 LANGUAGE sql
AS $function$
SELECT
    p.codigo_interno AS codigo_articulo,
    p.nombre AS descripcion_articulo,
    s.stock,
    p.precio_compra AS precio_costo,
    (s.stock * p.precio_compra) AS total
FROM stock s
INNER JOIN almacen a  ON s.id_almacen = a.id
INNER JOIN productos_v p ON s.id_producto = p.id
WHERE p.id_empresa = _id_empresa
  AND (sucursal_id IS NULL OR a.id_sucursal = sucursal_id)
  AND (almacen_id  IS NULL OR a.id = almacen_id);
$function$;

CREATE OR REPLACE FUNCTION public.report_stock_bajo_minimo(_id_empresa integer, sucursal_id integer DEFAULT NULL::integer, almacen_id integer DEFAULT NULL::integer)
 RETURNS TABLE(codigo_articulo text, descripcion_articulo text, stock numeric, stock_minimo numeric, precio_costo numeric, total numeric)
 LANGUAGE sql
AS $function$
SELECT
    p.codigo_interno AS codigo_articulo,
    p.nombre AS descripcion_articulo,
    s.stock,
    s.stock_minimo,
    p.precio_compra AS precio_costo,
    (s.stock * p.precio_compra) AS total
FROM stock s
INNER JOIN almacen a  ON s.id_almacen = a.id
INNER JOIN productos_v p ON s.id_producto = p.id
WHERE p.id_empresa = _id_empresa
  AND (sucursal_id IS NULL OR a.id_sucursal = sucursal_id)
  AND (almacen_id  IS NULL OR a.id = almacen_id)
  AND s.stock < s.stock_minimo;
$function$;

-- Ganancia: NULL (no 0) para quien no ve costos, así la app no muestra una
-- ganancia falsa.
CREATE OR REPLACE FUNCTION public.dashboardsumargananciadetalleventa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT
    CASE WHEN (SELECT admin_ve_costos())
         THEN COALESCE(SUM(dv.total - dv.cantidad*dv.precio_compra), 0) END
FROM
    ventas AS v inner join detalle_venta_v dv on dv.id_venta=v.id
WHERE
    v.id_empresa = _id_empresa
   AND DATE(v.fecha) >= DATE(_fecha_inicio)
  AND DATE(v.fecha) <= DATE(_fecha_fin);
$function$;
