-- "Piezas vendidas" del dashboard: solo productos que se venden por pieza.
-- Los de venta por peso (sevende_por 'GRANEL' = kg, 'GRAMO' = g) sumaban sus
-- kilos/gramos con las piezas. En la base hay valores viejos en minúsculas,
-- por eso se compara con upper().

CREATE OR REPLACE FUNCTION public.dashboardsumarcantidaddetalleventa(_id_empresa integer, _fecha_inicio timestamp without time zone, _fecha_fin timestamp without time zone)
 RETURNS numeric
 LANGUAGE sql
AS $function$
SELECT 
    COALESCE(SUM(dv.cantidad), 0) -- Asegura que retorne 0 si no hay ventas
FROM 
    ventas AS v inner join detalle_venta dv on dv.id_venta=v.id
    left join productos p on p.id=dv.id_producto
WHERE 
    v.id_empresa = _id_empresa
   AND v.estado = 'confirmada'
   AND upper(coalesce(p.sevende_por, '')) NOT IN ('GRANEL', 'GRAMO')
   AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
  AND DATE(v.fecha) <= DATE(_fecha_fin);   -- Convierte a solo fecha
$function$;
