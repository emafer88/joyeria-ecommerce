-- ============================================================================
-- Ventas del turno en el POS: ver, reimprimir y cancelar.
--
-- Cancelar (anular_venta) no borra la venta: queda con estado 'anulada', quién
-- la canceló, quién la autorizó y por qué, y se revierte lo que hizo al
-- cobrarse:
--   * stock de productos que lo controlan (+ movimiento en el kardex);
--   * piezas de joyería vendidas vuelven a 'disponible' (+ movimiento);
--   * el dinero sale de la caja: una 'salida' por cada método con que se
--     pagó, en el mismo turno.
-- Solo ventas del POS, confirmadas y de un turno de caja todavía abierto.
--
-- Cualquier usuario del POS la puede pedir, pero se necesita la clave numérica
-- de alguien que pueda autorizar: el gerente (superadmin/admin) o quien tenga
-- el permiso "Autorizar cancelaciones". Cada uno define su clave en Mi perfil;
-- se guarda con bcrypt en usuarios_clave, que la app no puede leer. Cinco
-- claves incorrectas seguidas bloquean al que lo intenta 15 minutos.
--
-- Los totales del dashboard/reportes que no miraban el estado ahora ignoran
-- las ventas anuladas, y el cierre de caja resta las salidas por cancelación.
-- ============================================================================

INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Autorizar cancelaciones', 'autorizar con su clave la cancelación de ventas',
       '/iconos/factura-2.png', '#autorizar-cancelaciones', '#permiso'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE nombre = 'Autorizar cancelaciones');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id, m.id
  FROM public.usuarios u
  JOIN public.roles r ON r.id = u.id_rol AND r.nombre IN ('superadmin', 'admin')
 CROSS JOIN public.modulos m
 WHERE m.nombre = 'Autorizar cancelaciones'
   AND NOT EXISTS (SELECT 1 FROM public.permisos p
                    WHERE p.id_usuario = u.id AND p.idmodulo = m.id);

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS anulada_en       timestamptz,
  ADD COLUMN IF NOT EXISTS anulada_por      bigint REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS autorizada_por   bigint REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

-- ----------------------------------------------------------------------------
-- Clave de autorización
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios_clave (
  id_usuario bigint      PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  clave_hash text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usuarios_clave ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios_clave FROM PUBLIC, anon, authenticated;

-- Intentos fallidos de clave de quien pide la cancelación.
CREATE TABLE IF NOT EXISTS public.clave_intentos (
  id_usuario      bigint      PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fallos          integer     NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz
);
ALTER TABLE public.clave_intentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clave_intentos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_usuario_actual()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM usuarios WHERE id_auth = auth.uid()::text AND estado = 'ACTIVO';
$$;
REVOKE ALL ON FUNCTION public.admin_usuario_actual() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_puede_autorizar(_id_usuario bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
     WHERE u.id = _id_usuario AND u.estado = 'ACTIVO'
       AND (EXISTS (SELECT 1 FROM roles r
                     WHERE r.id = u.id_rol AND r.nombre IN ('superadmin', 'admin'))
            OR EXISTS (SELECT 1 FROM permisos p JOIN modulos m ON m.id = p.idmodulo
                        WHERE p.id_usuario = u.id AND m.nombre = 'Autorizar cancelaciones')));
$$;
REVOKE ALL ON FUNCTION public.admin_puede_autorizar(bigint) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.tengo_clave_autorizacion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios_clave WHERE id_usuario = admin_usuario_actual());
$$;
REVOKE ALL ON FUNCTION public.tengo_clave_autorizacion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tengo_clave_autorizacion() TO authenticated;

-- Para cambiarla hay que dar la actual: una sesión abierta en la caja no
-- alcanza para cambiar la clave de su dueño.
CREATE OR REPLACE FUNCTION public.guardar_clave_autorizacion(_clave_nueva text, _clave_actual text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_usuario bigint := admin_usuario_actual();
  v_hash    text;
BEGIN
  IF v_usuario IS NULL OR NOT admin_puede_autorizar(v_usuario) THEN
    RAISE EXCEPTION 'Tu usuario no autoriza cancelaciones' USING ERRCODE = '42501';
  END IF;
  IF coalesce(_clave_nueva, '') !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'La clave debe tener de 4 a 8 números';
  END IF;
  SELECT clave_hash INTO v_hash FROM usuarios_clave WHERE id_usuario = v_usuario;
  IF v_hash IS NOT NULL AND v_hash IS DISTINCT FROM crypt(coalesce(_clave_actual, ''), v_hash) THEN
    RAISE EXCEPTION 'La clave actual no es correcta';
  END IF;
  INSERT INTO usuarios_clave (id_usuario, clave_hash, updated_at)
  VALUES (v_usuario, crypt(_clave_nueva, gen_salt('bf')), now())
  ON CONFLICT (id_usuario) DO UPDATE
     SET clave_hash = EXCLUDED.clave_hash, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_clave_autorizacion(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_clave_autorizacion(text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- Cancelar. Devuelve 'ok', 'clave_incorrecta' o 'bloqueado' (sin excepción,
-- para que el intento fallido quede contado).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.anular_venta(integer, text);

CREATE OR REPLACE FUNCTION public.anular_venta(_id_venta integer, _motivo text, _clave text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v           ventas%ROWTYPE;
  v_usuario   bigint := admin_usuario_actual();
  v_autoriza  bigint;
  v_intentos  clave_intentos%ROWTYPE;
  v_nota      text;
BEGIN
  IF v_usuario IS NULL OR NOT admin_es_personal() THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar ventas' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(_motivo), '') = '' THEN
    RAISE EXCEPTION 'Escribe el motivo de la cancelación';
  END IF;

  SELECT * INTO v FROM ventas WHERE id = _id_venta FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta % no encontrada', _id_venta;
  END IF;
  IF v.origen IS DISTINCT FROM 'pos' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar ventas del punto de venta';
  END IF;
  IF v.estado IS DISTINCT FROM 'confirmada' THEN
    RAISE EXCEPTION 'La venta % no está cobrada (estado %)', v.nro_comprobante, v.estado;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cierrecaja cc
                  WHERE cc.id = v.id_cierre_caja AND cc.estado = 0) THEN
    RAISE EXCEPTION 'Solo se pueden cancelar ventas del turno de caja abierto';
  END IF;

  -- Clave de quien autoriza.
  SELECT * INTO v_intentos FROM clave_intentos WHERE id_usuario = v_usuario FOR UPDATE;
  IF v_intentos.bloqueado_hasta > now() THEN
    RETURN 'bloqueado';
  END IF;
  SELECT c.id_usuario INTO v_autoriza
    FROM usuarios_clave c
   WHERE c.clave_hash = crypt(coalesce(_clave, ''), c.clave_hash)
     AND admin_puede_autorizar(c.id_usuario)
   LIMIT 1;
  IF v_autoriza IS NULL THEN
    INSERT INTO clave_intentos (id_usuario, fallos) VALUES (v_usuario, 1)
    ON CONFLICT (id_usuario) DO UPDATE
       SET fallos = CASE WHEN clave_intentos.fallos + 1 >= 5 THEN 0
                         ELSE clave_intentos.fallos + 1 END,
           bloqueado_hasta = CASE WHEN clave_intentos.fallos + 1 >= 5
                                  THEN now() + interval '15 minutes'
                                  ELSE clave_intentos.bloqueado_hasta END;
    RETURN 'clave_incorrecta';
  END IF;
  DELETE FROM clave_intentos WHERE id_usuario = v_usuario;

  v_nota := 'venta cancelada ' || v.nro_comprobante || ': ' || trim(_motivo);

  -- Stock de productos por cantidad/peso.
  UPDATE stock s
     SET stock = s.stock + dv.cantidad
    FROM detalle_venta dv
    JOIN productos p ON p.id = dv.id_producto
   WHERE dv.id_venta = v.id
     AND dv.id_pieza IS NULL
     AND p.maneja_inventarios
     AND s.id_producto = dv.id_producto
     AND s.id_almacen = dv.id_almacen;

  INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
  SELECT dv.id_almacen, dv.id_producto, 'ingreso', dv.cantidad, now(),
         'venta cancelada ' || v.nro_comprobante, 'ventas'
    FROM detalle_venta dv
    JOIN productos p ON p.id = dv.id_producto
   WHERE dv.id_venta = v.id
     AND dv.id_pieza IS NULL
     AND p.maneja_inventarios;

  -- Piezas de joyería.
  INSERT INTO movimientos_piezas (id_pieza, id_empresa, tipo, estado_anterior, estado_nuevo,
                                  id_usuario, id_referencia, referencia_tipo, notas)
  SELECT pi.id, pi.id_empresa, 'devolucion', 'vendida', 'disponible', v_usuario,
         v.id, 'venta', v_nota
    FROM piezas_inventario pi
    JOIN detalle_venta dv ON dv.id = pi.id_detalle_venta
   WHERE dv.id_venta = v.id
     AND pi.estado = 'vendida';

  UPDATE piezas_inventario pi
     SET estado = 'disponible', id_detalle_venta = NULL, id_venta_reserva = NULL,
         updated_at = now()
    FROM detalle_venta dv
   WHERE dv.id = pi.id_detalle_venta
     AND dv.id_venta = v.id
     AND pi.estado = 'vendida';

  -- Dinero: se devuelve lo cobrado, por el mismo método (efectivo neto del
  -- cambio que se entregó).
  INSERT INTO movimientos_caja (tipo_movimiento, monto, id_metodo_pago, descripcion,
                                id_usuario, id_cierre_caja, id_ventas, vuelto)
  SELECT 'salida',
         CASE WHEN mp.nombre = 'Efectivo' THEN mc.monto - coalesce(mc.vuelto, 0) ELSE mc.monto END,
         mc.id_metodo_pago,
         'Cancelación de venta ' || v.nro_comprobante || ': ' || trim(_motivo),
         v_usuario, v.id_cierre_caja, v.id, 0
    FROM movimientos_caja mc
    JOIN metodos_pago mp ON mp.id = mc.id_metodo_pago
   WHERE mc.id_ventas = v.id
     AND mc.tipo_movimiento = 'ingreso';

  UPDATE ventas
     SET estado = 'anulada', anulada_en = now(), anulada_por = v_usuario,
         autorizada_por = v_autoriza, motivo_anulacion = trim(_motivo)
   WHERE id = v.id;
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.anular_venta(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_venta(integer, text, text) TO authenticated, service_role;

-- Cierre de caja: las salidas por cancelación restan.
CREATE OR REPLACE FUNCTION public.sumarventasmetodopagomovcierrecaja(_id_cierre_caja integer)
 RETURNS TABLE(metodo_pago text, monto numeric)
 LANGUAGE sql
AS $function$
select mp.nombre as metodo_pago,
       SUM(CASE WHEN mc.tipo_movimiento = 'salida' THEN -1 ELSE 1 END
           * CASE WHEN mp.nombre='Efectivo' THEN mc.monto - mc.vuelto ELSE mc.monto END) as monto
from movimientos_caja as mc
inner join cierrecaja as cc
on
mc.id_cierre_caja = cc.id
inner join metodos_pago as mp
on mc.id_metodo_pago = mp.id
where mc.id_ventas is not  null
and mc.id_cierre_caja = _id_cierre_caja and cc.estado = 0
group by mp.nombre
$function$;

-- Dashboard y top de productos: mismas definiciones de antes, sin las ventas
-- anuladas.

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
   AND v.estado IS DISTINCT FROM 'anulada'
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
   AND v.estado IS DISTINCT FROM 'anulada'
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
    AND v.estado IS DISTINCT FROM 'anulada'
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
   AND v.estado IS DISTINCT FROM 'anulada'
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
   AND v.estado IS DISTINCT FROM 'anulada'
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
       AND v.estado IS DISTINCT FROM 'anulada'
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
    AND v.estado IS DISTINCT FROM 'anulada'
    AND DATE(v.fecha) >= DATE(_fecha_inicio) -- Convierte a solo fecha
    AND DATE(v.fecha) <= DATE(_fecha_fin)   -- Convierte a solo fecha
GROUP BY
    DATE(v.fecha) -- Agrupa por fecha
ORDER BY
    fecha; -- Ordena por fecha
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
      and v.estado IS DISTINCT FROM 'anulada'
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
      and v.estado IS DISTINCT FROM 'anulada'
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
    AND v.estado IS DISTINCT FROM 'anulada'
    AND v.fecha >= _fecha_inicio
    AND v.fecha <= _fecha_fin;
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
    AND v.estado IS DISTINCT FROM 'anulada'
    AND mc.id_ventas IS NOT NULL
GROUP BY
    DATE(mc.fecha_movimiento), mp.nombre -- Agrupa por fecha y método de pago
ORDER BY
    fecha asc; -- Ordena por fecha y luego por total de ventas
$function$;
