-- Los 3 reportes (Inventario valorado, Stock bajo mínimo, Ventas por sucursal)
-- salían vacíos con frecuencia porque:
--   * exigían sí o sí sucursal + almacén; sin selección -> 0 filas
--   * no ofrecían "todas las sucursales" / "todos los almacenes"
--   * no filtraban por empresa (con sucursal en NULL habrían cruzado datos
--     de otras empresas)
--
-- Se recrean agregando `_id_empresa` (obligatorio, scope multiempresa) y
-- haciendo opcionales sucursal_id / almacen_id / fechas: NULL = "todos".
-- Cambia la firma -> DROP + CREATE + re-GRANT. El shape de retorno no cambia.

DROP FUNCTION IF EXISTS public.report_stock_por_almacen_sucursal(integer, integer);

CREATE FUNCTION public.report_stock_por_almacen_sucursal (
  _id_empresa integer,
  sucursal_id integer DEFAULT NULL,
  almacen_id  integer DEFAULT NULL
)
  RETURNS TABLE (
    codigo_articulo      text,
    descripcion_articulo text,
    stock                numeric,
    precio_costo         numeric,
    total                numeric
  )
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
INNER JOIN productos p ON s.id_producto = p.id
WHERE p.id_empresa = _id_empresa
  AND (sucursal_id IS NULL OR a.id_sucursal = sucursal_id)
  AND (almacen_id  IS NULL OR a.id = almacen_id);
$function$;

GRANT EXECUTE ON FUNCTION public.report_stock_por_almacen_sucursal(integer, integer, integer)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


DROP FUNCTION IF EXISTS public.report_stock_bajo_minimo(integer, integer);

CREATE FUNCTION public.report_stock_bajo_minimo (
  _id_empresa integer,
  sucursal_id integer DEFAULT NULL,
  almacen_id  integer DEFAULT NULL
)
  RETURNS TABLE (
    codigo_articulo      text,
    descripcion_articulo text,
    stock                numeric,
    stock_minimo         numeric,
    precio_costo         numeric,
    total                numeric
  )
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
INNER JOIN productos p ON s.id_producto = p.id
WHERE p.id_empresa = _id_empresa
  AND (sucursal_id IS NULL OR a.id_sucursal = sucursal_id)
  AND (almacen_id  IS NULL OR a.id = almacen_id)
  AND s.stock < s.stock_minimo;
$function$;

GRANT EXECUTE ON FUNCTION public.report_stock_bajo_minimo(integer, integer, integer)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


DROP FUNCTION IF EXISTS public.report_ventas_por_sucursal(integer, date, date);

CREATE FUNCTION public.report_ventas_por_sucursal (
  _id_empresa  integer,
  sucursal_id  integer DEFAULT NULL,
  fecha_inicio date    DEFAULT NULL,
  fecha_fin    date    DEFAULT NULL
)
  RETURNS TABLE (
    id_venta           integer,
    fecha              timestamp without time zone,
    monto_total        numeric,
    total_impuestos    numeric,
    subtotal           numeric,
    saldo              numeric,
    pago_con           text,
    cantidad_productos integer,
    id_usuario         integer,
    cajero             text,
    id_cliente         integer,
    estado             text
  )
  LANGUAGE sql
  AS $function$
SELECT
    v.id AS id_venta,
    v.fecha,
    v.monto_total,
    v.total_impuestos,
    v.sub_total AS subtotal,
    v.saldo,
    v.pago_con,
    v.cantidad_productos,
    v.id_usuario,
    u.nombres AS cajero,
    v.id_cliente,
    v.estado
FROM ventas v
LEFT JOIN usuarios u ON v.id_usuario = u.id
WHERE v.id_empresa = _id_empresa
  AND (sucursal_id  IS NULL OR v.id_sucursal = sucursal_id)
  AND (fecha_inicio IS NULL OR DATE(v.fecha) >= fecha_inicio)
  AND (fecha_fin    IS NULL OR DATE(v.fecha) <= fecha_fin);
$function$;

GRANT EXECUTE ON FUNCTION public.report_ventas_por_sucursal(integer, integer, date, date)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
