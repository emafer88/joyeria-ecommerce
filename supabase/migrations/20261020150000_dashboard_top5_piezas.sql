-- Top 5 del dashboard (lista y gráfica) por piezas vendidas: igual que la
-- tarjeta "Piezas vendidas" (20261020140000), sin productos de venta por
-- peso ('GRANEL' = kg, 'GRAMO' = g), cuyos kilos/gramos no se comparan con
-- piezas.

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
      and upper(coalesce(p.sevende_por, '')) NOT IN ('GRANEL', 'GRAMO')
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
