-- Dashboard: número de ventas, ticket promedio y desglose por método de pago
-- y por canal, para el rango de fechas. Solo ventas cobradas ('confirmada'),
-- como el resto del dashboard.
--
-- Método de pago = lo que entró a caja por esa venta: ingresos de
-- movimientos_caja, con el efectivo neto del cambio (así la suma cuadra con
-- el total de ventas; incluye los abonos de apartados liquidados). Las
-- ventas sin movimientos de caja (tienda en línea, Mercado Libre) van con su
-- canal como método.

CREATE OR REPLACE FUNCTION public.dashboard_desglose_ventas(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone
)
  RETURNS json
  LANGUAGE sql
  STABLE
AS $function$
WITH v AS (
  SELECT id, origen, monto_total
    FROM ventas
   WHERE id_empresa = _id_empresa
     AND estado = 'confirmada'
     AND DATE(fecha) >= DATE(_fecha_inicio)
     AND DATE(fecha) <= DATE(_fecha_fin)
),
pagos AS (
  SELECT COALESCE(mp.nombre, 'Otro') AS metodo,
         mc.monto - CASE WHEN mp.nombre = 'Efectivo' THEN COALESCE(mc.vuelto, 0) ELSE 0 END AS monto
    FROM v
    JOIN movimientos_caja mc ON mc.id_ventas = v.id AND mc.tipo_movimiento = 'ingreso'
    LEFT JOIN metodos_pago mp ON mp.id = mc.id_metodo_pago
  UNION ALL
  SELECT CASE v.origen
           WHEN 'ecommerce'    THEN 'Mercado Pago'
           WHEN 'mercadolibre' THEN 'Mercado Libre'
           ELSE 'Sin método registrado'
         END,
         v.monto_total
    FROM v
   WHERE NOT EXISTS (SELECT 1 FROM movimientos_caja mc
                      WHERE mc.id_ventas = v.id AND mc.tipo_movimiento = 'ingreso')
)
SELECT json_build_object(
  'num_ventas', (SELECT count(*) FROM v),
  'total',      (SELECT COALESCE(sum(monto_total), 0) FROM v),
  'ticket_promedio', (SELECT COALESCE(round(avg(monto_total), 2), 0) FROM v),
  'metodos', COALESCE((
     SELECT json_agg(json_build_object('metodo', metodo, 'total', total) ORDER BY total DESC)
       FROM (SELECT metodo, round(sum(monto), 2) AS total FROM pagos GROUP BY metodo) m
      WHERE total <> 0), '[]'::json),
  'canales', COALESCE((
     SELECT json_agg(json_build_object('canal', origen, 'ventas', ventas, 'total', total) ORDER BY total DESC)
       FROM (SELECT origen, count(*) AS ventas, round(sum(monto_total), 2) AS total
               FROM v GROUP BY origen) c), '[]'::json)
);
$function$;

REVOKE ALL ON FUNCTION public.dashboard_desglose_ventas(integer, timestamp without time zone, timestamp without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_desglose_ventas(integer, timestamp without time zone, timestamp without time zone) TO authenticated;
