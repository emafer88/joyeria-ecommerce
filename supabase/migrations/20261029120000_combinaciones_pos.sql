-- Fase C3: tallas y colores en el punto de venta.
--
--   * buscarproductos devuelve tiene_combinaciones: el POS pide talla y color
--     antes de agregar esos productos.
--   * pos_combinaciones: combinaciones de un producto con su existencia en el
--     almacén de la caja.
--   * pos_buscar_combinacion: escanear el código de barras (o SKU) de una
--     combinación la agrega directo.
--   * insertardetalleventa recibe _id_combinacion (NULL = como siempre) y
--     junta renglones solo de la misma combinación.
--   * detalle_venta_v expone id_combinacion y el código de la combinación
--     (para el ticket).
--   * anular_venta y cancelar_apartado devuelven el stock a la fila de la
--     combinación (antes sumaban a todas las filas del producto) y el kardex
--     lleva id_combinacion. Mismo cuerpo que en 20261019150000_cancelar_ventas
--     y 20261019160000_apartados salvo eso.
--   * authenticated puede leer id_combinacion de detalle_venta y
--     ecommerce_orden_items (faltaba el permiso por columna).

-- ----------------------------------------------------------------------------
-- Desde 20261006120000_ocultar_costo authenticated lee detalle_venta y
-- ecommerce_orden_items columna por columna (todas menos el costo); las
-- columnas que agregaron C1 y C2 se quedaron sin ese permiso.
-- ----------------------------------------------------------------------------
GRANT SELECT (id_combinacion) ON public.detalle_venta TO authenticated;
GRANT SELECT (id_combinacion) ON public.ecommerce_orden_items TO authenticated;

-- ----------------------------------------------------------------------------
-- Buscador del POS
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.buscarproductos(integer, text);

CREATE FUNCTION public.buscarproductos(_id_empresa integer, buscador text)
 RETURNS TABLE(id integer, nombre text, precio_venta numeric, precio_compra numeric, id_categoria integer, sevende_por text, codigo_barras text, codigo_interno text, id_empresa integer, maneja_inventarios boolean, maneja_multiprecios boolean, p_venta text, p_compra text, categoria text, imagen_portada text, tiene_combinaciones boolean)
 LANGUAGE sql
AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 CASE WHEN p.precio_compra IS NOT NULL
      THEN concat(e.simbolo_moneda, ' ', p.precio_compra) END as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada,
 exists (select 1 from producto_combinaciones pc
          where pc.id_producto = p.id and pc.activo) as tiene_combinaciones
  from productos_v as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE
    ORDER BY p.nombre ASC
    LIMIT 10;
$function$;
REVOKE ALL ON FUNCTION public.buscarproductos(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscarproductos(integer, text) TO authenticated, service_role;

-- Combinaciones activas de un producto con su existencia en el almacén
-- (NULL si nunca tuvo entrada ahí). Corre con los permisos de quien llama.
CREATE OR REPLACE FUNCTION public.pos_combinaciones(_id_producto bigint, _id_almacen bigint)
RETURNS TABLE (
  id            bigint,
  talla         text,
  color         text,
  color_hex     text,
  codigo_barras text,
  orden         integer,
  stock         numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT pc.id, pc.talla, pc.color, pc.color_hex, pc.codigo_barras, pc.orden, s.stock
    FROM producto_combinaciones pc
    LEFT JOIN stock s ON s.id_combinacion = pc.id AND s.id_almacen = _id_almacen
   WHERE pc.id_producto = _id_producto
     AND pc.activo
   ORDER BY pc.orden, pc.id;
$$;
REVOKE ALL ON FUNCTION public.pos_combinaciones(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_combinaciones(bigint, bigint) TO authenticated;

-- Combinación por código de barras o SKU exacto, con los datos del producto
-- que necesita el carrito.
CREATE OR REPLACE FUNCTION public.pos_buscar_combinacion(_id_empresa bigint, _codigo text)
RETURNS TABLE (
  id             integer,
  nombre         text,
  precio_venta   numeric,
  precio_compra  numeric,
  sevende_por    text,
  id_combinacion bigint,
  talla          text,
  color          text
)
LANGUAGE sql
STABLE
AS $$
  SELECT p.id, p.nombre, p.precio_venta, p.precio_compra, p.sevende_por,
         pc.id, pc.talla, pc.color
    FROM producto_combinaciones pc
    JOIN productos_v p ON p.id = pc.id_producto
   WHERE p.id_empresa = _id_empresa
     AND p.activo
     AND pc.activo
     AND (pc.codigo_barras = trim(_codigo)
          OR lower(pc.sku) = lower(trim(_codigo)))
   ORDER BY (pc.codigo_barras = trim(_codigo)) DESC
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.pos_buscar_combinacion(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_buscar_combinacion(bigint, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- Agregar al carrito
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.insertardetalleventa(integer, numeric, numeric, integer, numeric, text, integer, integer);

CREATE FUNCTION public.insertardetalleventa (
  _id_venta       integer,
  _cantidad       numeric,
  _precio_venta   numeric,
  _id_producto    integer,
  _precio_compra  numeric,
  _descripcion    text,
  _id_sucursal    integer,
  _id_almacen     integer,
  _id_combinacion bigint DEFAULT NULL
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$BEGIN
    -- Verificar si el producto (y su combinación) ya existe en el detalle de venta
    IF EXISTS (
        SELECT 1
        FROM detalle_venta
        WHERE id_venta = _id_venta
          AND id_producto = _id_producto
          AND id_almacen = _id_almacen
          AND id_combinacion IS NOT DISTINCT FROM _id_combinacion
    ) THEN
        -- Si existe, actualizar la cantidad y el total
        UPDATE detalle_venta
        SET cantidad = cantidad + _cantidad,
            total = round((cantidad + _cantidad) * _precio_venta, 2)
        WHERE id_venta = _id_venta
          AND id_producto = _id_producto
          AND id_almacen = _id_almacen
          AND id_combinacion IS NOT DISTINCT FROM _id_combinacion;
    ELSE
        -- Si no existe, insertar un nuevo registro
        INSERT INTO detalle_venta (
            id_venta, id_producto, cantidad, precio_venta,
            precio_compra, descripcion, total, id_sucursal,id_almacen,
            id_combinacion
        ) VALUES (
            _id_venta, _id_producto, _cantidad, _precio_venta,
            _precio_compra, _descripcion, round(_cantidad * _precio_venta, 2), _id_sucursal,_id_almacen,
            _id_combinacion
        );
    END IF;
END;$function$;
REVOKE ALL ON FUNCTION public.insertardetalleventa(integer, numeric, numeric, integer, numeric, text, integer, integer, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insertardetalleventa(integer, numeric, numeric, integer, numeric, text, integer, integer, bigint) TO authenticated, service_role;

-- Columnas nuevas al final (CREATE OR REPLACE VIEW solo deja agregar ahí).
CREATE OR REPLACE VIEW public.detalle_venta_v WITH (security_barrier) AS
SELECT id, id_venta, cantidad, precio_venta, total, descripcion, id_producto,
       CASE WHEN (SELECT admin_ve_costos()) THEN precio_compra END AS precio_compra,
       id_sucursal, estado, id_almacen, id_pieza, id_combinacion,
       (SELECT pc.codigo_barras FROM public.producto_combinaciones pc
         WHERE pc.id = detalle_venta.id_combinacion) AS codigo_combinacion
  FROM public.detalle_venta
 WHERE (SELECT admin_es_personal());

-- ----------------------------------------------------------------------------
-- Cancelar venta / apartado: stock por combinación
-- ----------------------------------------------------------------------------
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
   WHERE pgp_sym_decrypt(c.clave_cifrada, admin_llave_clave()) = coalesce(_clave, '')
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
     AND s.id_almacen = dv.id_almacen
     AND s.id_combinacion IS NOT DISTINCT FROM dv.id_combinacion;

  INSERT INTO movimientos_stock (id_almacen, id_producto, id_combinacion, tipo_movimiento, cantidad, fecha, detalle, origen)
  SELECT dv.id_almacen, dv.id_producto, dv.id_combinacion, 'ingreso', dv.cantidad, now(),
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
     AND s.id_almacen = dv.id_almacen
     AND s.id_combinacion IS NOT DISTINCT FROM dv.id_combinacion;

  INSERT INTO movimientos_stock (id_almacen, id_producto, id_combinacion, tipo_movimiento, cantidad, fecha, detalle, origen)
  SELECT dv.id_almacen, dv.id_producto, dv.id_combinacion, 'ingreso', dv.cantidad, now(),
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
