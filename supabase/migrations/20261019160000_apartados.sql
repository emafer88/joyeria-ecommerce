-- ============================================================================
-- Apartados en el POS.
--
-- Un apartado es una venta con estado 'apartada': sus líneas ya descontaron
-- stock y sus piezas de joyería siguen 'reservada' (como en el carrito), así
-- que nadie más las vende. Cada abono es un ingreso en movimientos_caja con
-- id_ventas, en el turno donde se cobró. Al cubrir el total pasa a
-- 'confirmada' (el trigger de joyería marca las piezas vendidas) y cuenta
-- como venta del turno en que se liquidó.
--
-- Reglas:
--   * Solo productos con permite_apartado.
--   * Cliente obligatorio (no el genérico).
--   * Anticipo mínimo: empresa.apartado_anticipo_pct % del total.
--   * Plazo: empresa.apartado_dias; vencido solo se marca, no se cancela solo.
--   * Cancelar pide la clave de autorización (como cancelar una venta) y quien
--     cancela decide cuánto devolver (0 .. lo abonado), en efectivo.
-- Las ventas apartadas no cuentan en dashboard/top hasta liquidarse.
-- ============================================================================

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS permite_apartado boolean NOT NULL DEFAULT false;
-- productos tiene SELECT por columna (ver 20261006120000_ocultar_costo.sql).
GRANT SELECT (permite_apartado) ON public.productos TO authenticated;

CREATE OR REPLACE VIEW public.productos_v WITH (security_barrier) AS
SELECT id, nombre, precio_venta,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra END AS precio_compra,
       id_categoria, codigo_barras, codigo_interno, id_empresa, sevende_por,
       maneja_inventarios, maneja_multiprecios, id_marca, descripcion,
       es_joyeria, created_at, updated_at, activo, destacado, precio_oferta,
       oferta_desde, oferta_hasta, medidas, tallas, visible_ecommerce,
       permite_apartado
  FROM public.productos
 WHERE (SELECT admin_es_personal());

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS apartado_anticipo_pct numeric NOT NULL DEFAULT 20
    CHECK (apartado_anticipo_pct >= 0 AND apartado_anticipo_pct <= 100),
  ADD COLUMN IF NOT EXISTS apartado_dias integer NOT NULL DEFAULT 30
    CHECK (apartado_dias > 0);

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS apartado_creado timestamptz,
  ADD COLUMN IF NOT EXISTS apartado_vence  date;

-- Lo abonado a una venta: ingresos (efectivo neto del cambio) menos salidas.
CREATE OR REPLACE FUNCTION public.apartado_abonado(_id_venta bigint)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(sum(
           CASE WHEN mc.tipo_movimiento = 'salida' THEN -mc.monto
                WHEN mp.nombre = 'Efectivo' THEN mc.monto - coalesce(mc.vuelto, 0)
                ELSE mc.monto END), 0)
    FROM movimientos_caja mc
    JOIN metodos_pago mp ON mp.id = mc.id_metodo_pago
   WHERE mc.id_ventas = _id_venta;
$$;
REVOKE ALL ON FUNCTION public.apartado_abonado(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apartado_abonado(bigint) TO authenticated;

-- Clave de autorización (misma lógica que anular_venta): devuelve
-- 'ok' + quién autoriza, 'clave_incorrecta' o 'bloqueado'. Cuenta los fallos
-- de quien lo intenta; quien la llama no debe lanzar excepción después de un
-- fallo o el conteo se pierde.
CREATE OR REPLACE FUNCTION public.admin_verificar_clave(_clave text, OUT resultado text, OUT id_autoriza bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_usuario  bigint := admin_usuario_actual();
  v_intentos clave_intentos%ROWTYPE;
BEGIN
  SELECT * INTO v_intentos FROM clave_intentos WHERE id_usuario = v_usuario FOR UPDATE;
  IF v_intentos.bloqueado_hasta > now() THEN
    resultado := 'bloqueado';
    RETURN;
  END IF;
  SELECT c.id_usuario INTO id_autoriza
    FROM usuarios_clave c
   WHERE pgp_sym_decrypt(c.clave_cifrada, admin_llave_clave()) = coalesce(_clave, '')
     AND admin_puede_autorizar(c.id_usuario)
   LIMIT 1;
  IF id_autoriza IS NULL THEN
    INSERT INTO clave_intentos (id_usuario, fallos) VALUES (v_usuario, 1)
    ON CONFLICT (id_usuario) DO UPDATE
       SET fallos = CASE WHEN clave_intentos.fallos + 1 >= 5 THEN 0
                         ELSE clave_intentos.fallos + 1 END,
           bloqueado_hasta = CASE WHEN clave_intentos.fallos + 1 >= 5
                                  THEN now() + interval '15 minutes'
                                  ELSE clave_intentos.bloqueado_hasta END;
    resultado := 'clave_incorrecta';
    RETURN;
  END IF;
  DELETE FROM clave_intentos WHERE id_usuario = v_usuario;
  resultado := 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_verificar_clave(text) FROM PUBLIC, anon, authenticated;

-- Turno de caja abierto o error.
CREATE OR REPLACE FUNCTION public.admin_exigir_turno_abierto(_id_cierre_caja bigint)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cierrecaja WHERE id = _id_cierre_caja AND estado = 0) THEN
    RAISE EXCEPTION 'La caja no tiene un turno abierto';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_exigir_turno_abierto(bigint) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- Crear: convierte la venta del carrito en apartado y cobra el anticipo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_apartado(
  _id_venta       integer,
  _id_cliente     integer,
  _anticipo       numeric,
  _id_metodo_pago integer,
  _fecha          timestamp
)
RETURNS SETOF ventas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v         ventas%ROWTYPE;
  v_usuario bigint := admin_usuario_actual();
  v_total   numeric;
  v_minimo  numeric;
  v_pct     numeric;
  v_dias    integer;
  v_no      text;
BEGIN
  IF v_usuario IS NULL OR NOT admin_es_personal() THEN
    RAISE EXCEPTION 'No tienes permiso para apartar' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM ventas WHERE id = _id_venta FOR UPDATE;
  IF NOT FOUND OR v.estado IS DISTINCT FROM 'pendiente' OR v.origen IS DISTINCT FROM 'pos' THEN
    RAISE EXCEPTION 'No hay una venta en curso para apartar';
  END IF;
  PERFORM admin_exigir_turno_abierto(v.id_cierre_caja);

  IF _id_cliente IS NULL OR NOT EXISTS (
       SELECT 1 FROM clientes_proveedores
        WHERE id = _id_cliente AND id_empresa = v.id_empresa AND tipo IS DISTINCT FROM '-') THEN
    RAISE EXCEPTION 'Elige el cliente que aparta (no puede ser el cliente genérico)';
  END IF;

  SELECT string_agg(DISTINCT p.nombre, ', ') INTO v_no
    FROM detalle_venta dv JOIN productos p ON p.id = dv.id_producto
   WHERE dv.id_venta = v.id AND NOT p.permite_apartado;
  IF v_no IS NOT NULL THEN
    RAISE EXCEPTION 'Estos productos no se pueden apartar: %', v_no;
  END IF;

  SELECT coalesce(sum(total), 0) INTO v_total FROM detalle_venta WHERE id_venta = v.id;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'La venta no tiene productos';
  END IF;
  v_total := round(v_total, 2);
  SELECT apartado_anticipo_pct, apartado_dias INTO v_pct, v_dias
    FROM empresa WHERE id = v.id_empresa;
  v_minimo := round(v_total * v_pct / 100, 2);
  IF _anticipo IS NULL OR _anticipo < v_minimo THEN
    RAISE EXCEPTION 'El anticipo mínimo es % (% %% del total)', v_minimo, v_pct;
  END IF;
  IF _anticipo >= v_total THEN
    RAISE EXCEPTION 'Si paga el total, cóbrala como venta normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM metodos_pago WHERE id = _id_metodo_pago) THEN
    RAISE EXCEPTION 'Elige cómo paga el anticipo';
  END IF;

  UPDATE ventas
     SET estado = 'apartada', id_cliente = _id_cliente, id_usuario = v_usuario,
         monto_total = v_total, sub_total = v_total,
         nro_comprobante = 'AP-' || lpad(v.id::text, 6, '0'),
         fecha = coalesce(_fecha, now()::timestamp),
         apartado_creado = now(), apartado_vence = current_date + v_dias
   WHERE id = v.id;

  INSERT INTO movimientos_caja (tipo_movimiento, monto, id_metodo_pago, descripcion,
                                id_usuario, id_cierre_caja, id_ventas, vuelto)
  VALUES ('ingreso', _anticipo, _id_metodo_pago,
          'Anticipo de apartado AP-' || lpad(v.id::text, 6, '0'),
          v_usuario, v.id_cierre_caja, v.id, 0);

  RETURN QUERY SELECT * FROM ventas WHERE id = v.id;
END;
$$;
REVOKE ALL ON FUNCTION public.crear_apartado(integer, integer, numeric, integer, timestamp) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_apartado(integer, integer, numeric, integer, timestamp) TO authenticated;

-- ----------------------------------------------------------------------------
-- Abonar: si cubre el saldo, el apartado se liquida y queda como venta del
-- turno actual.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abonar_apartado(
  _id_venta       integer,
  _monto          numeric,
  _id_metodo_pago integer,
  _id_cierre_caja integer,
  _fecha          timestamp
)
RETURNS SETOF ventas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v         ventas%ROWTYPE;
  v_usuario bigint := admin_usuario_actual();
  v_saldo   numeric;
BEGIN
  IF v_usuario IS NULL OR NOT admin_es_personal() THEN
    RAISE EXCEPTION 'No tienes permiso para abonar' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM ventas WHERE id = _id_venta FOR UPDATE;
  IF NOT FOUND OR v.estado IS DISTINCT FROM 'apartada' THEN
    RAISE EXCEPTION 'El apartado ya no está activo';
  END IF;
  PERFORM admin_exigir_turno_abierto(_id_cierre_caja);
  IF NOT EXISTS (SELECT 1 FROM metodos_pago WHERE id = _id_metodo_pago) THEN
    RAISE EXCEPTION 'Elige cómo paga el abono';
  END IF;

  v_saldo := round(v.monto_total - apartado_abonado(v.id), 2);
  IF _monto IS NULL OR _monto <= 0 THEN
    RAISE EXCEPTION 'Escribe el monto del abono';
  END IF;
  IF _monto > v_saldo THEN
    RAISE EXCEPTION 'El abono es mayor que el saldo (%)', v_saldo;
  END IF;

  INSERT INTO movimientos_caja (tipo_movimiento, monto, id_metodo_pago, descripcion,
                                id_usuario, id_cierre_caja, id_ventas, vuelto)
  VALUES ('ingreso', _monto, _id_metodo_pago,
          'Abono a apartado ' || v.nro_comprobante,
          v_usuario, _id_cierre_caja, v.id, 0);

  IF _monto >= v_saldo THEN
    UPDATE ventas
       SET estado = 'confirmada', fecha = coalesce(_fecha, now()::timestamp),
           id_cierre_caja = _id_cierre_caja, id_usuario = v_usuario
     WHERE id = v.id;
  END IF;

  RETURN QUERY SELECT * FROM ventas WHERE id = v.id;
END;
$$;
REVOKE ALL ON FUNCTION public.abonar_apartado(integer, numeric, integer, integer, timestamp) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abonar_apartado(integer, numeric, integer, integer, timestamp) TO authenticated;

-- ----------------------------------------------------------------------------
-- Cancelar: con clave de autorización; regresa stock y piezas y devuelve en
-- efectivo lo que se decida (0 .. abonado). 'ok' | 'clave_incorrecta' |
-- 'bloqueado'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_apartado(
  _id_venta       integer,
  _motivo         text,
  _clave          text,
  _devolver       numeric,
  _id_cierre_caja integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v          ventas%ROWTYPE;
  v_usuario  bigint := admin_usuario_actual();
  v_clave    record;
  v_abonado  numeric;
  v_efectivo bigint;
BEGIN
  IF v_usuario IS NULL OR NOT admin_es_personal() THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar apartados' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(_motivo), '') = '' THEN
    RAISE EXCEPTION 'Escribe el motivo de la cancelación';
  END IF;
  SELECT * INTO v FROM ventas WHERE id = _id_venta FOR UPDATE;
  IF NOT FOUND OR v.estado IS DISTINCT FROM 'apartada' THEN
    RAISE EXCEPTION 'El apartado ya no está activo';
  END IF;
  PERFORM admin_exigir_turno_abierto(_id_cierre_caja);
  v_abonado := round(apartado_abonado(v.id), 2);
  IF _devolver IS NULL OR _devolver < 0 OR _devolver > v_abonado THEN
    RAISE EXCEPTION 'Lo que se devuelve debe ser de 0 a lo abonado (%)', v_abonado;
  END IF;
  IF _devolver > 0 THEN
    SELECT id INTO v_efectivo FROM metodos_pago
     WHERE nombre = 'Efectivo' AND id_empresa = v.id_empresa LIMIT 1;
    IF v_efectivo IS NULL THEN
      RAISE EXCEPTION 'No existe el método de pago Efectivo';
    END IF;
  END IF;

  SELECT * INTO v_clave FROM admin_verificar_clave(_clave);
  IF v_clave.resultado <> 'ok' THEN
    RETURN v_clave.resultado;
  END IF;

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
         'apartado cancelado ' || v.nro_comprobante, 'ventas'
    FROM detalle_venta dv
    JOIN productos p ON p.id = dv.id_producto
   WHERE dv.id_venta = v.id
     AND dv.id_pieza IS NULL
     AND p.maneja_inventarios;

  -- Piezas apartadas (siguen 'reservada' por esta venta).
  INSERT INTO movimientos_piezas (id_pieza, id_empresa, tipo, estado_anterior, estado_nuevo,
                                  id_usuario, id_referencia, referencia_tipo, notas)
  SELECT pi.id, pi.id_empresa, 'cancelacion_reserva', 'reservada', 'disponible', v_usuario,
         v.id, 'venta', 'apartado cancelado ' || v.nro_comprobante || ': ' || trim(_motivo)
    FROM piezas_inventario pi
   WHERE pi.id_venta_reserva = v.id
     AND pi.estado = 'reservada';

  UPDATE piezas_inventario
     SET estado = 'disponible', id_detalle_venta = NULL, id_venta_reserva = NULL,
         updated_at = now()
   WHERE id_venta_reserva = v.id
     AND estado = 'reservada';

  IF _devolver > 0 THEN
    INSERT INTO movimientos_caja (tipo_movimiento, monto, id_metodo_pago, descripcion,
                                  id_usuario, id_cierre_caja, id_ventas, vuelto)
    VALUES ('salida', _devolver, v_efectivo,
            'Devolución por apartado cancelado ' || v.nro_comprobante || ': ' || trim(_motivo),
            v_usuario, _id_cierre_caja, v.id, 0);
  END IF;

  UPDATE ventas
     SET estado = 'anulada', anulada_en = now(), anulada_por = v_usuario,
         autorizada_por = v_clave.id_autoriza, motivo_anulacion = trim(_motivo)
   WHERE id = v.id;
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.cancelar_apartado(integer, text, text, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_apartado(integer, text, text, numeric, integer) TO authenticated;

-- Dashboard y top de productos: las ventas apartadas tampoco cuentan hasta
-- liquidarse (mismas definiciones de 20261019150000_cancelar_ventas.sql).

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
   AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
   AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
    AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
   AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
   AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
       AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
    AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
    AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
      and v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
      and v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
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
    AND v.estado IS DISTINCT FROM 'anulada' AND v.estado IS DISTINCT FROM 'apartada'
    AND v.fecha >= _fecha_inicio
    AND v.fecha <= _fecha_fin;
$function$;
