-- Detalle de las tarjetas del dashboard (clic en la tarjeta), para el mismo
-- rango de fechas y solo ventas cobradas ('confirmada'), como las tarjetas.
--   * dashboard_detalle_ventas: una fila por venta (Ventas / Ticket promedio).
--   * dashboard_detalle_productos: una fila por producto (Piezas vendidas /
--     Ganancias). La ganancia sale de detalle_venta_v, que ya enmascara el
--     costo, y además es NULL sin el permiso "Ver costos".

CREATE OR REPLACE FUNCTION public.dashboard_detalle_ventas(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone
)
  RETURNS TABLE(id bigint, fecha timestamp without time zone, nro_comprobante text,
                origen text, cliente text, cajero text, articulos bigint, total numeric)
  LANGUAGE sql
  STABLE
AS $function$
SELECT v.id, v.fecha, v.nro_comprobante, v.origen,
       COALESCE(e.destinatario, NULLIF(cp.nombres, '-')) AS cliente,
       u.nombres AS cajero,
       (SELECT count(*) FROM detalle_venta_v dv WHERE dv.id_venta = v.id) AS articulos,
       v.monto_total AS total
  FROM ventas v
  LEFT JOIN clientes_proveedores cp ON cp.id = v.id_cliente
  LEFT JOIN usuarios u ON u.id = v.id_usuario
  LEFT JOIN ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
 WHERE v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio)
   AND DATE(v.fecha) <= DATE(_fecha_fin)
 ORDER BY v.fecha DESC
 LIMIT 1000;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_detalle_productos(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone
)
  RETURNS TABLE(id_producto integer, producto text, sevende_por text,
                cantidad numeric, total numeric, ganancia numeric)
  LANGUAGE sql
  STABLE
AS $function$
SELECT p.id::integer, p.nombre, p.sevende_por,
       SUM(dv.cantidad) AS cantidad,
       SUM(dv.total) AS total,
       CASE WHEN (SELECT admin_ve_costos())
            THEN SUM(dv.total - dv.cantidad * dv.precio_compra) END AS ganancia
  FROM ventas v
  JOIN detalle_venta_v dv ON dv.id_venta = v.id
  JOIN productos p ON p.id = dv.id_producto
 WHERE v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio)
   AND DATE(v.fecha) <= DATE(_fecha_fin)
 GROUP BY p.id, p.nombre, p.sevende_por
 ORDER BY SUM(dv.total) DESC;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_detalle_ventas(integer, timestamp without time zone, timestamp without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_detalle_ventas(integer, timestamp without time zone, timestamp without time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_detalle_productos(integer, timestamp without time zone, timestamp without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_detalle_productos(integer, timestamp without time zone, timestamp without time zone) TO authenticated;
