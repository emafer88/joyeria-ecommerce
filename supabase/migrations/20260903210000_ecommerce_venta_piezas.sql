-- ============================================================================
-- Ecommerce: venta atómica que soporta piezas de joyería serializadas
-- (crear_venta_externa, la función original del canal externo, solo soporta
-- productos por cantidad vía la tabla `stock`).
-- ============================================================================
-- Flujo completo (ver Edge Functions en supabase/functions/):
--   1) crear-preferencia-pago inserta una fila en `ventas` con estado
--      'pendiente', origen='ecommerce', id_orden_externa=<uuid>. Por cada
--      pieza del carrito llama a reservar_pieza(...) (ya existente, atómico:
--      solo pasa de 'disponible' a 'reservada'). Por cada producto por
--      cantidad, inserta una fila en `ecommerce_orden_items` (no hay reserva
--      posible para stock por cantidad sin tocar el flujo del POS).
--   2) El cliente paga en Mercado Pago.
--   3) webhook-mercadopago verifica el pago y llama a
--      crear_venta_externa_piezas(...), que:
--        - encuentra la venta 'pendiente' por (origen, id_orden_externa)
--        - inserta detalle_venta por cada pieza YA RESERVADA para esa venta
--          (piezas_inventario.id_venta_reserva = id de la venta) -> el
--          trigger existente joyeria_detalle_venta_ai completa la reserva,
--          sin necesidad de ningún trigger nuevo
--        - inserta detalle_venta por cada fila de ecommerce_orden_items
--          (sin id_pieza) -> el trigger existente validarstock descuenta
--          stock atómicamente
--        - actualiza la venta a 'confirmada', generando recién ahí el
--          nro_comprobante -> dispara joyeria_ventas_confirmar_au (existente,
--          AFTER UPDATE ON ventas), que promueve las piezas reservadas a
--          'vendida'
--   No se creó NINGÚN trigger nuevo: se reutilizan los que ya existen sobre
--   detalle_venta/ventas para joyería (ver sql/2026-08-27_modulo_joyeria.sql
--   y supabase/migrations/20260828193000_fix_joyeria_reserva_pieza_after_insert.sql).
--
-- Reservas sin expiración: no existe ningún mecanismo de TTL en la base (ver
-- ecommerce_liberar_reservas_vencidas más abajo, pensada para correr por
-- cron). La reserva se hace recién al crear la preferencia de pago (no al
-- agregar al carrito), para minimizar la ventana de bloqueo de cada pieza.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Bookkeeping de líneas "por cantidad" (NO serializadas) de una orden de
--    ecommerce, entre el momento de crear la preferencia de pago y el
--    momento en que llega el webhook de Mercado Pago (que no trae el
--    carrito, solo el external_reference). Las piezas de joyería NO
--    necesitan esta tabla: ya quedan asociadas vía
--    piezas_inventario.id_venta_reserva.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ecommerce_orden_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    origen text NOT NULL,
    id_orden_externa text NOT NULL,
    id_producto bigint NOT NULL REFERENCES public.productos (id),
    id_almacen bigint NOT NULL REFERENCES public.almacen (id),
    cantidad numeric NOT NULL CHECK (cantidad > 0),
    precio_venta numeric NOT NULL,
    precio_compra numeric,
    descripcion text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecommerce_orden_items_orden_idx
    ON public.ecommerce_orden_items (origen, id_orden_externa);

-- Solo el backend (service_role) la usa; nunca el navegador.
REVOKE ALL ON public.ecommerce_orden_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ecommerce_orden_items TO postgres, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ecommerce_orden_items_id_seq TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 2) crear_venta_externa_piezas: confirma una venta de ecommerce que puede
--    incluir piezas serializadas y/o productos por cantidad. Hermana de
--    crear_venta_externa (esa no se modifica). Idempotente: si la venta ya
--    está 'confirmada' la devuelve tal cual sin reprocesar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_venta_externa_piezas(
    _canal text,
    _id_orden_externa text,
    _id_tipo_comprobante integer,
    _serie text
) RETURNS SETOF public.ventas
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_venta public.ventas%ROWTYPE;
    v_nro_comprobante text;
    v_pieza record;
    v_item record;
BEGIN
    IF _canal IS NULL OR _id_orden_externa IS NULL THEN
        RAISE EXCEPTION 'crear_venta_externa_piezas requiere _canal y _id_orden_externa';
    END IF;

    -- Lock de la fila: si dos webhooks (ej. reintento de Mercado Pago)
    -- llegan casi al mismo tiempo, el segundo espera a que el primero
    -- termine y después ve el estado ya actualizado (ver chequeo de abajo).
    SELECT * INTO v_venta FROM public.ventas
     WHERE origen = _canal AND id_orden_externa = _id_orden_externa
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una venta pendiente para % / % (crear-preferencia-pago debe crearla antes de confirmar)',
            _canal, _id_orden_externa;
    END IF;

    IF v_venta.estado = 'confirmada' THEN
        RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
        RETURN;
    END IF;

    -- Piezas de joyería ya reservadas para esta venta (reservar_pieza fue
    -- llamado desde crear-preferencia-pago). El trigger joyeria_detalle_venta_ai
    -- (AFTER INSERT existente) completa la reserva al ver id_pieza no nulo.
    FOR v_pieza IN
        SELECT id, id_producto, id_almacen, precio_venta, costo
        FROM public.piezas_inventario
        WHERE id_venta_reserva = v_venta.id AND estado = 'reservada'
    LOOP
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, id_pieza, cantidad, precio_venta,
            precio_compra, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_pieza.id_producto, v_pieza.id, 1, v_pieza.precio_venta,
            v_pieza.costo, v_pieza.precio_venta, v_venta.id_sucursal, v_pieza.id_almacen
        );
    END LOOP;

    -- Productos por cantidad (no serializados): el trigger validarstock
    -- (AFTER... ya existente sobre detalle_venta) descuenta stock atómico.
    FOR v_item IN
        SELECT id_producto, id_almacen, cantidad, precio_venta, precio_compra, descripcion
        FROM public.ecommerce_orden_items
        WHERE origen = _canal AND id_orden_externa = _id_orden_externa
    LOOP
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, cantidad, precio_venta,
            precio_compra, descripcion, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_item.id_producto, v_item.cantidad, v_item.precio_venta,
            v_item.precio_compra, v_item.descripcion,
            v_item.cantidad * v_item.precio_venta, v_venta.id_sucursal, v_item.id_almacen
        );
    END LOOP;

    -- El número de comprobante se genera recién acá (no al crear la
    -- preferencia): si el pago nunca se confirma, no se "quema" un número.
    SELECT public.generar_nro_comprobante(_id_tipo_comprobante, _serie, v_venta.id_sucursal::integer)
      INTO v_nro_comprobante;

    UPDATE public.ventas
       SET estado = 'confirmada', nro_comprobante = v_nro_comprobante
     WHERE id = v_venta.id;
    -- Dispara zzz_joyeria_ventas_confirmar_au (ya existente, AFTER UPDATE ON
    -- ventas): promueve a 'vendida' las piezas reservadas de esta venta.

    RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
END;
$$;

-- Solo el backend (service_role), nunca el navegador: crea comprobantes
-- oficiales y confirma ventas directamente, igual que crear_venta_externa.
REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 3) Limpieza de reservas de ecommerce abandonadas (nadie completó el pago).
--    Pensada para invocarse por cron cada 5-10 minutos desde una Edge
--    Function (liberar-reservas-vencidas). No existe ningún otro mecanismo
--    de expiración en esta base.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_liberar_reservas_vencidas(_minutos integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_liberadas integer;
BEGIN
    WITH liberadas AS (
        UPDATE public.piezas_inventario pi
           SET estado = 'disponible', id_venta_reserva = NULL, updated_at = now()
          FROM public.ventas v
         WHERE v.id = pi.id_venta_reserva
           AND v.origen = 'ecommerce'
           AND v.estado = 'pendiente'
           AND pi.estado = 'reservada'
           AND pi.updated_at < now() - (_minutos || ' minutes')::interval
        RETURNING pi.id
    )
    SELECT count(*) INTO v_liberadas FROM liberadas;

    UPDATE public.ventas
       SET estado = 'anulada'
     WHERE origen = 'ecommerce'
       AND estado = 'pendiente'
       AND fecha < now() - (_minutos || ' minutes')::interval
       AND NOT EXISTS (
             SELECT 1 FROM public.piezas_inventario pi
              WHERE pi.id_venta_reserva = ventas.id AND pi.estado = 'reservada'
           );

    RETURN v_liberadas;
END;
$$;

REVOKE ALL ON FUNCTION public.ecommerce_liberar_reservas_vencidas(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ecommerce_liberar_reservas_vencidas(integer) TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 4) Prerrequisito operativo: serie de comprobante propia para el ecommerce
--    (Boleta, sucursal 1 = "Joyeria max"), separada de la serie B001 que ya
--    usa el POS para no pisar la numeración. generar_nro_comprobante() busca
--    por (id_tipo_comprobante, serie, sucursal_id), así que conviven sin
--    problema. Idempotente: no hace nada si ya existe.
-- ----------------------------------------------------------------------------
INSERT INTO public.serializacion_comprobantes
    (id_tipo_comprobante, serie, cantidad_numeros, correlativo, sucursal_id, por_default)
SELECT 2, 'WEB', 8, 0, 1, false
WHERE NOT EXISTS (
    SELECT 1 FROM public.serializacion_comprobantes
     WHERE id_tipo_comprobante = 2 AND serie = 'WEB' AND sucursal_id = 1
);
