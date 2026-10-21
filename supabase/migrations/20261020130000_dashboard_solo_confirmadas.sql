-- Dashboard y reportes: contar solo ventas cobradas (estado 'confirmada').
-- Antes se excluían solo 'anulada' y 'apartada', así que también contaban
-- los carritos del POS sin cobrar ('pendiente'), las ventas en espera
-- ('espera') y los pedidos de la tienda en línea sin pagar ('pendiente', que
-- ya traen monto_total). Mismas definiciones de 20261019160000_apartados.sql
-- con ese único cambio en el filtro.

CREATE OR REPLACE FUNCTION public.dashboardsumarcantidaddetalleventa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT 
    COALESCE(SUM(dv.cantidad), 0) -- Asegura que retorne 0 si no hay ventas
FROM 
    ventas AS v inner join detalle_venta dv on dv.id_venta=v.id
WHERE 
    v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
  AND DATE(v.fecha) <= DATE(_fecha_fin);   -- Convierte a solo fecha
$function$;

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
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio)
  AND DATE(v.fecha) <= DATE(_fecha_fin);
$function$;

CREATE OR REPLACE FUNCTION public.dashboardsumarventaporempresa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT
    COALESCE(SUM(v.monto_total), 0) -- Asegura que siempre retorne 0 si no hay ventas
FROM
    ventas AS v
WHERE
    v.id_empresa = _id_empresa
    AND v.estado = 'confirmada'
    AND v.fecha >= _fecha_inicio
    AND v.fecha <= (_fecha_fin + INTERVAL '1 day' - INTERVAL '1 second'); -- Incluye el final del día
$function$;

CREATE OR REPLACE FUNCTION public.dashboardsumarventasporempresa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT 
    COALESCE(SUM(v.monto_total), 0) -- Asegura que retorne 0 si no hay ventas
FROM 
    ventas AS v
WHERE 
    v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
  AND DATE(v.fecha) <= DATE(_fecha_fin);   -- Convierte a solo fecha
$function$;

CREATE OR REPLACE FUNCTION public.dashboardsumarventasporempresaperiodoanterior(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT 
    COALESCE(SUM(v.monto_total), 0) -- Asegura que retorne 0 si no hay ventas
FROM 
    ventas AS v
WHERE 
    v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
  AND DATE(v.fecha) <= DATE(_fecha_fin);   -- Convierte a solo fecha
$function$;

CREATE OR REPLACE FUNCTION public.dashboardtop5productosmasvendidos(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS TABLE(id_producto integer, nombre_producto text, total_vendido numeric, porcentaje numeric)
 LANGUAGE sql
AS $function$
WITH top_productos AS (
    SELECT
        dv.id_producto,
        p.nombre AS nombre_producto,
        SUM(dv.cantidad) AS total_vendido
    FROM
        detalle_venta AS dv
    INNER JOIN
        ventas AS v
    ON
        dv.id_venta = v.id
    INNER JOIN
        productos AS p
    ON
        dv.id_producto = p.id
    WHERE
        v.id_empresa = _id_empresa
       AND v.estado = 'confirmada'
       AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
  AND DATE(v.fecha) <= DATE(_fecha_fin)   -- Convierte a solo fecha
    GROUP BY
        dv.id_producto, p.nombre
    ORDER BY
        total_vendido DESC
    LIMIT 5
),
total_general AS (
    SELECT
        SUM(total_vendido) AS total
    FROM
        top_productos
)
SELECT
    tp.id_producto,
    tp.nombre_producto,
    tp.total_vendido,
    ROUND((tp.total_vendido / tg.total) * 100, 2) AS porcentaje
FROM
    top_productos tp,
    total_general tg;
$function$;

CREATE OR REPLACE FUNCTION public.dashboartotalventasconfechas(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS TABLE(fecha date, total_ventas numeric)
 LANGUAGE sql
AS $function$
SELECT
    DATE(v.fecha) AS fecha, -- Agrupa por la fecha (sin tiempo)
    COALESCE(SUM(v.monto_total), 0) AS total_ventas -- Calcula el total de ventas
FROM
    ventas AS v
WHERE
    v.id_empresa = _id_empresa -- Filtra por empresa
    AND v.estado = 'confirmada'
    AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
    AND DATE(v.fecha) <= DATE(_fecha_fin)   -- Convierte a solo fecha
GROUP BY
    DATE(v.fecha) -- Agrupa por fecha
ORDER BY
    fecha; -- Ordena por fecha
$function$;

CREATE OR REPLACE FUNCTION public.dashboartotalventasxmetodopago(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS TABLE(fecha date, metodo_pago text, total_ventas numeric)
 LANGUAGE sql
AS $function$
SELECT
    DATE(mc.fecha_movimiento) AS fecha, -- Agrupa por la fecha (sin tiempo)
    mp.nombre AS metodo_pago, -- Nombre del método de pago
    COALESCE(SUM(mc.monto), 0) AS total_ventas -- Suma el total de ventas
FROM
    ventas AS v
INNER JOIN
    movimientos_caja AS mc
ON
    v.id = mc.id_ventas -- Relación entre ventas y movimientos de caja
INNER JOIN
    metodos_pago AS mp
ON
    mc.id_metodo_pago = mp.id -- Relación con métodos de pago
WHERE
    v.id_empresa = _id_empresa -- Filtra por empresa
    AND DATE(mc.fecha_movimiento) >= DATE(_fecha_inicio) -- Filtra por fecha de inicio
    AND DATE(mc.fecha_movimiento) <= DATE(_fecha_fin) -- Filtra por fecha de fin
    AND v.estado = 'confirmada'
    AND mc.id_ventas IS NOT NULL
GROUP BY
    DATE(mc.fecha_movimiento), mp.nombre -- Agrupa por fecha y método de pago
ORDER BY
    fecha asc; -- Ordena por fecha y luego por total de ventas
$function$;

CREATE OR REPLACE FUNCTION public.mostrartop10productosmasvendidosxmonto(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS TABLE(id_producto integer, nombre_producto text, total_vendido numeric, porcentaje numeric)
 LANGUAGE sql
AS $function$
   with top_productos as (
      select dv.id_producto,
      p.nombre as nombre_producto,
      SUM(dv.total) as total_vendido
      from detalle_venta as dv
      inner join 
      ventas as v
      on
      dv.id_venta = v.id
      inner join 
      productos as p
      on 
      dv.id_producto = p.id
      where 
      v.id_empresa = _id_empresa
      and v.estado = 'confirmada'
      and DATE(v.fecha) >= DATE(_fecha_inicio)
      and DATE(v.fecha) <= DATE(_fecha_fin)
      group by 
       dv.id_producto,p.nombre
      order by 
      total_vendido desc
      limit 10
   ),
 total_general as (
    select 
       SUM(total_vendido) as total
       from top_productos
 )
 select 
    tp.id_producto,
    tp.nombre_producto,
    tp.total_vendido,
    ROUND((tp.total_vendido/tg.total) * 100, 2) as porcentaje
 from
  top_productos tp,
  total_general tg;
$function$;

CREATE OR REPLACE FUNCTION public.mostrartop5productosmasvendidosxcantidad(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS TABLE(id_producto integer, nombre_producto text, total_vendido numeric, porcentaje numeric)
 LANGUAGE sql
AS $function$
   with top_productos as (
      select dv.id_producto,
      p.nombre as nombre_producto,
      SUM(dv.cantidad) as total_vendido
      from detalle_venta as dv
      inner join 
      ventas as v
      on
      dv.id_venta = v.id
      inner join 
      productos as p
      on 
      dv.id_producto = p.id
      where 
      v.id_empresa = _id_empresa
      and v.estado = 'confirmada'
      and DATE(v.fecha) >= DATE(_fecha_inicio)
      and DATE(v.fecha) <= DATE(_fecha_fin)
      group by 
       dv.id_producto,p.nombre
      order by 
      total_vendido desc
      limit 5
   ),
 total_general as (
    select 
       SUM(total_vendido) as total
       from top_productos
 )
 select 
    tp.id_producto,
    tp.nombre_producto,
    tp.total_vendido,
    ROUND((tp.total_vendido/tg.total) * 100, 2) as porcentaje
 from
  top_productos tp,
  total_general tg;
$function$;

CREATE OR REPLACE FUNCTION public.sumarventasporempresa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT 
    COALESCE(SUM(v.monto_total), 0) -- Asegura que retorne 0 si no hay ventas
FROM 
    ventas AS v
WHERE 
    v.id_empresa = _id_empresa
    AND v.estado = 'confirmada'
    AND v.fecha >= _fecha_inicio
    AND v.fecha <= _fecha_fin;
$function$;
