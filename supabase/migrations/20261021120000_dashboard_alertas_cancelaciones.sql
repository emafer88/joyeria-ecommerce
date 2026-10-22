-- Dashboard: alertas de inventario y cancelaciones del periodo.
--
--   * dashboard_alertas_inventario: al día de hoy (no depende de fechas).
--       agotado        productos con inventario en 0 (por almacén) y productos
--                      de joyería sin piezas disponibles (que sí tuvieron);
--       bajo           stock por debajo del mínimo del almacén (mismo criterio
--                      que el reporte "Stock bajo mínimo");
--       sin_movimiento con existencias, dados de alta hace más de
--                      _dias_sin_movimiento días y sin ventas cobradas en ese
--                      lapso; trae la última venta (NULL si nunca se vendió).
--     Solo productos activos.
--   * dashboard_cancelaciones: ventas cobradas que se cancelaron en el rango
--     (por la fecha de cancelación en la zona horaria _zona, la del navegador;
--     el POS ya guarda la hora local): ventas del
--     POS, apartados y órdenes de Mercado Libre. No cuenta los pedidos de la
--     tienda en línea que se anulan por no pagarse, porque nunca se cobraron.
--     ML no guarda cuándo se canceló: se usa la fecha de la venta.
--   * dashboard_ventas_por_hora (mapa de calor) recibe la zona _zona: antes
--     pasaba las ventas de la tienda y ML siempre a la hora del centro de
--     México, y en otras zonas (p. ej. Baja California) quedaban corridas 1-2
--     horas. El rango de fechas también se compara contra la fecha local.

CREATE OR REPLACE FUNCTION public.dashboard_alertas_inventario(
  _id_empresa          integer,
  _dias_sin_movimiento integer DEFAULT 60
)
  RETURNS TABLE(tipo text, id_producto bigint, producto text, almacen text,
                existencias numeric, stock_minimo numeric, sevende_por text,
                valor numeric, ultima_venta timestamp without time zone)
  LANGUAGE sql
  STABLE
AS $function$
WITH prod AS (
  SELECT p.id, p.nombre, p.precio_venta, p.sevende_por, p.es_joyeria,
         p.maneja_inventarios, p.created_at
    FROM productos_v p
   WHERE p.id_empresa = _id_empresa
     AND p.activo IS DISTINCT FROM false
     AND (p.es_joyeria OR p.maneja_inventarios)
),
stk AS (
  SELECT s.id_producto, a.nombre AS almacen, s.stock, s.stock_minimo
    FROM stock s
    JOIN prod p ON p.id = s.id_producto AND NOT p.es_joyeria
    LEFT JOIN almacen a ON a.id = s.id_almacen
),
piezas AS (
  SELECT pi.id_producto,
         count(*) FILTER (WHERE pi.estado = 'disponible') AS disponibles,
         COALESCE(sum(pi.precio_venta) FILTER (WHERE pi.estado = 'disponible'), 0) AS valor
    FROM piezas_inventario_v pi
    JOIN prod p ON p.id = pi.id_producto AND p.es_joyeria
   GROUP BY pi.id_producto
),
existencia AS (
  SELECT p.id,
         CASE WHEN p.es_joyeria THEN COALESCE(pz.disponibles, 0)
              ELSE COALESCE((SELECT sum(s.stock) FROM stk s WHERE s.id_producto = p.id), 0)
         END AS existencias,
         CASE WHEN p.es_joyeria THEN COALESCE(pz.valor, 0)
              ELSE COALESCE((SELECT sum(s.stock) FROM stk s WHERE s.id_producto = p.id), 0)
                   * COALESCE(p.precio_venta, 0)
         END AS valor
    FROM prod p
    LEFT JOIN piezas pz ON pz.id_producto = p.id
),
ultima AS (
  SELECT dv.id_producto, max(v.fecha) AS fecha
    FROM detalle_venta dv
    JOIN ventas v ON v.id = dv.id_venta
   WHERE v.id_empresa = _id_empresa
     AND v.estado = 'confirmada'
   GROUP BY dv.id_producto
)
SELECT 'agotado', s.id_producto, p.nombre, s.almacen, s.stock, s.stock_minimo,
       p.sevende_por, 0::numeric, u.fecha
  FROM stk s
  JOIN prod p ON p.id = s.id_producto
  LEFT JOIN ultima u ON u.id_producto = p.id
 WHERE s.stock <= 0
UNION ALL
SELECT 'agotado', p.id, p.nombre, NULL, 0, NULL, p.sevende_por, 0, u.fecha
  FROM prod p
  JOIN piezas pz ON pz.id_producto = p.id
  LEFT JOIN ultima u ON u.id_producto = p.id
 WHERE pz.disponibles = 0
UNION ALL
SELECT 'bajo', s.id_producto, p.nombre, s.almacen, s.stock, s.stock_minimo,
       p.sevende_por, round(s.stock * COALESCE(p.precio_venta, 0), 2), u.fecha
  FROM stk s
  JOIN prod p ON p.id = s.id_producto
  LEFT JOIN ultima u ON u.id_producto = p.id
 WHERE s.stock > 0 AND s.stock < s.stock_minimo
UNION ALL
SELECT 'sin_movimiento', p.id, p.nombre, NULL, e.existencias, NULL,
       p.sevende_por, round(e.valor, 2), u.fecha
  FROM prod p
  JOIN existencia e ON e.id = p.id
  LEFT JOIN ultima u ON u.id_producto = p.id
 WHERE e.existencias > 0
   AND p.created_at < now() - make_interval(days => _dias_sin_movimiento)
   AND (u.fecha IS NULL
        OR u.fecha < now()::timestamp - make_interval(days => _dias_sin_movimiento))
ORDER BY 1, 8 DESC, 3;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_cancelaciones(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone,
  _zona         text DEFAULT 'America/Mexico_City'
)
  RETURNS TABLE(id bigint, nro_comprobante text, tipo text,
                fecha_venta timestamp without time zone,
                cancelada timestamp without time zone, monto numeric,
                motivo text, cancelo text, autorizo text, cliente text)
  LANGUAGE sql
  STABLE
AS $function$
WITH c AS (
  SELECT v.*,
         CASE WHEN v.anulada_en IS NOT NULL
                THEN v.anulada_en AT TIME ZONE _zona
              WHEN v.origen = 'pos' THEN v.fecha
              ELSE (v.fecha AT TIME ZONE 'UTC') AT TIME ZONE _zona
         END AS cancelada_local
    FROM ventas v
   WHERE v.id_empresa = _id_empresa
     AND v.estado = 'anulada'
     AND (v.anulada_en IS NOT NULL OR v.origen = 'mercadolibre')
)
SELECT c.id, c.nro_comprobante,
       CASE WHEN c.origen = 'mercadolibre' THEN 'Mercado Libre'
            WHEN c.apartado_vence IS NOT NULL THEN 'Apartado'
            ELSE 'Venta' END,
       c.fecha, c.cancelada_local, round(c.monto_total, 2),
       COALESCE(c.motivo_anulacion,
                CASE WHEN c.origen = 'mercadolibre' THEN 'Cancelada en Mercado Libre' END),
       uc.nombres, ua.nombres, cl.nombres
  FROM c
  LEFT JOIN usuarios uc ON uc.id = c.anulada_por
  LEFT JOIN usuarios ua ON ua.id = c.autorizada_por
  LEFT JOIN clientes_proveedores cl ON cl.id = c.id_cliente
 WHERE DATE(c.cancelada_local) >= DATE(_fecha_inicio)
   AND DATE(c.cancelada_local) <= DATE(_fecha_fin)
 ORDER BY c.cancelada_local DESC;
$function$;

DROP FUNCTION IF EXISTS public.dashboard_ventas_por_hora(integer, timestamp without time zone, timestamp without time zone);

CREATE OR REPLACE FUNCTION public.dashboard_ventas_por_hora(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone,
  _zona         text DEFAULT 'America/Mexico_City'
)
  RETURNS TABLE(dia integer, hora integer, ventas bigint, total numeric)
  LANGUAGE sql
  STABLE
AS $function$
WITH v AS (
  SELECT CASE WHEN origen = 'pos' THEN fecha
              ELSE (fecha AT TIME ZONE 'UTC') AT TIME ZONE _zona
         END AS local,
         monto_total
    FROM ventas
   WHERE id_empresa = _id_empresa
     AND estado = 'confirmada'
)
SELECT extract(isodow FROM local)::integer AS dia,
       extract(hour FROM local)::integer AS hora,
       count(*) AS ventas,
       round(sum(monto_total), 2) AS total
  FROM v
 WHERE DATE(local) >= DATE(_fecha_inicio)
   AND DATE(local) <= DATE(_fecha_fin)
 GROUP BY 1, 2
 ORDER BY 1, 2;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_alertas_inventario(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_alertas_inventario(integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_cancelaciones(integer, timestamp without time zone, timestamp without time zone, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_cancelaciones(integer, timestamp without time zone, timestamp without time zone, text) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_ventas_por_hora(integer, timestamp without time zone, timestamp without time zone, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_ventas_por_hora(integer, timestamp without time zone, timestamp without time zone, text) TO authenticated;
