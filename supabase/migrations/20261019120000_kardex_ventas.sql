-- Movimientos de stock (kardex) que generan las ventas del POS.
--
-- Antes:
--   * agregar un producto a la venta se anotaba como 'ingreso' (es una salida);
--   * al cambiar la cantidad se anotaba la cantidad nueva completa en vez de
--     la diferencia;
--   * quitar un producto de la venta devolvía el stock sin anotar nada.
-- Con eso el historial no cuadraba con la existencia.

CREATE OR REPLACE FUNCTION public.validarstock()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    IF (SELECT p.maneja_inventarios FROM productos p WHERE p.id = NEW.id_producto) THEN

        -- Incremento de cantidad sobre un detalle_venta existente (UPDATE)
        IF TG_OP = 'UPDATE' AND NEW.cantidad > OLD.cantidad THEN
            UPDATE stock
               SET stock = stock - (NEW.cantidad - OLD.cantidad)
             WHERE id_producto = NEW.id_producto
               AND id_almacen = NEW.id_almacen
               AND stock >= (NEW.cantidad - OLD.cantidad);

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.descripcion;
            END IF;

            INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
            VALUES (NEW.id_almacen, NEW.id_producto, 'salida', NEW.cantidad - OLD.cantidad, now(), 'venta: se aumentó la cantidad', 'ventas');
        END IF;

        -- Decremento de cantidad (se devuelve stock): no requiere chequeo,
        -- sumar siempre es seguro, no hay forma de que "falle por falta de stock".
        IF TG_OP = 'UPDATE' AND NEW.cantidad < OLD.cantidad THEN
            UPDATE stock
               SET stock = stock + (OLD.cantidad - NEW.cantidad)
             WHERE id_producto = NEW.id_producto
               AND id_almacen = NEW.id_almacen;

            INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
            VALUES (NEW.id_almacen, NEW.id_producto, 'ingreso', OLD.cantidad - NEW.cantidad, now(), 'venta: se redujo la cantidad', 'ventas');
        END IF;

        -- Nuevo ítem en la venta (INSERT)
        IF TG_OP = 'INSERT' THEN
            UPDATE stock
               SET stock = stock - NEW.cantidad
             WHERE id_producto = NEW.id_producto
               AND id_almacen = NEW.id_almacen
               AND stock >= NEW.cantidad;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.descripcion;
            END IF;

            INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
            VALUES (NEW.id_almacen, NEW.id_producto, 'salida', NEW.cantidad, now(), 'venta', 'ventas');
        END IF;

    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.devolverstockaleliminardv()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    -- Verificar si el producto tiene inventario gestionado
    IF (SELECT p.maneja_inventarios FROM productos p WHERE p.id = OLD.id_producto) THEN
        -- Incrementar el stock correspondiente en el almacén
        UPDATE stock
        SET stock = stock + OLD.cantidad
        WHERE id_producto = OLD.id_producto
          AND id_almacen = OLD.id_almacen;

        IF FOUND THEN
            INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
            VALUES (OLD.id_almacen, OLD.id_producto, 'ingreso', OLD.cantidad, now(), 'venta: se quitó el producto', 'ventas');
        END IF;
    END IF;

    -- Continuar con la operación de eliminación
    RETURN OLD;
END;
$function$;

-- Historial: las ventas viejas quedaron anotadas como 'ingreso'.
UPDATE public.movimientos_stock
   SET tipo_movimiento = 'salida', detalle = 'venta'
 WHERE origen = 'ventas'
   AND detalle = 'nuevo registro'
   AND tipo_movimiento = 'ingreso';
