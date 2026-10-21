-- Pestaña "Joyería" del dashboard.
--   * dashboard_joyeria_ventas: piezas vendidas (ventas cobradas del rango)
--     por material y pureza de su variante: piezas, gramos, monto y ganancia
--     (NULL sin "Ver costos"; el costo sale de las vistas *_v, que ya lo
--     enmascaran).
--   * dashboard_joyeria_inventario: piezas disponibles hoy por material y
--     pureza: piezas, gramos y valor a precio de venta (no depende de fechas).

CREATE OR REPLACE FUNCTION public.dashboard_joyeria_ventas(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone
)
  RETURNS TABLE(material text, pureza text, piezas bigint, gramos numeric,
                total numeric, ganancia numeric)
  LANGUAGE sql
  STABLE
AS $function$
SELECT COALESCE(pv.material, 'Sin material') AS material,
       pv.pureza,
       count(*) AS piezas,
       round(COALESCE(sum(pi.peso), 0), 3) AS gramos,
       round(sum(dv.total), 2) AS total,
       CASE WHEN (SELECT admin_ve_costos())
            THEN round(sum(dv.total - dv.cantidad * dv.precio_compra), 2) END AS ganancia
  FROM ventas v
  JOIN detalle_venta_v dv ON dv.id_venta = v.id
  JOIN piezas_inventario_v pi ON pi.id = dv.id_pieza
  LEFT JOIN producto_variantes_v pv ON pv.id = pi.id_variante
 WHERE v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio)
   AND DATE(v.fecha) <= DATE(_fecha_fin)
 GROUP BY 1, 2
 ORDER BY sum(dv.total) DESC;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_joyeria_inventario(_id_empresa integer)
  RETURNS TABLE(material text, pureza text, piezas bigint, gramos numeric, valor numeric)
  LANGUAGE sql
  STABLE
AS $function$
SELECT COALESCE(pv.material, 'Sin material') AS material,
       pv.pureza,
       count(*) AS piezas,
       round(COALESCE(sum(pi.peso), 0), 3) AS gramos,
       round(COALESCE(sum(pi.precio_venta), 0), 2) AS valor
  FROM piezas_inventario_v pi
  LEFT JOIN producto_variantes_v pv ON pv.id = pi.id_variante
 WHERE pi.id_empresa = _id_empresa
   AND pi.estado = 'disponible'
 GROUP BY 1, 2
 ORDER BY sum(pi.peso) DESC NULLS LAST;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_joyeria_ventas(integer, timestamp without time zone, timestamp without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_joyeria_ventas(integer, timestamp without time zone, timestamp without time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_joyeria_inventario(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_joyeria_inventario(integer) TO authenticated;
