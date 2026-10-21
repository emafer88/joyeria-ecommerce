-- Mapa de calor del dashboard: ventas cobradas por día de la semana y hora.
-- dia: 1 = lunes ... 7 = domingo (ISO). hora: 0-23, hora local.
--
-- Las ventas del POS guardan la hora local del navegador; las de la tienda
-- en línea y Mercado Libre se guardan con now()/toISOString (UTC), así que
-- se pasan a la hora del centro de México. Si un cliente del sistema está en
-- otra zona horaria, habrá que guardar la zona en la empresa.

CREATE OR REPLACE FUNCTION public.dashboard_ventas_por_hora(
  _id_empresa   integer,
  _fecha_inicio timestamp without time zone,
  _fecha_fin    timestamp without time zone
)
  RETURNS TABLE(dia integer, hora integer, ventas bigint, total numeric)
  LANGUAGE sql
  STABLE
AS $function$
WITH v AS (
  SELECT CASE WHEN origen = 'pos' THEN fecha
              ELSE (fecha AT TIME ZONE 'UTC') AT TIME ZONE 'America/Mexico_City'
         END AS local,
         monto_total
    FROM ventas
   WHERE id_empresa = _id_empresa
     AND estado = 'confirmada'
     AND DATE(fecha) >= DATE(_fecha_inicio)
     AND DATE(fecha) <= DATE(_fecha_fin)
)
SELECT extract(isodow FROM local)::integer AS dia,
       extract(hour FROM local)::integer AS hora,
       count(*) AS ventas,
       round(sum(monto_total), 2) AS total
  FROM v
 GROUP BY 1, 2
 ORDER BY 1, 2;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_ventas_por_hora(integer, timestamp without time zone, timestamp without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_ventas_por_hora(integer, timestamp without time zone, timestamp without time zone) TO authenticated;
