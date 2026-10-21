-- En ventas por peso el total del renglón quedaba con más de 2 decimales
-- (0.350 kg × 189.90 = 66.465). Ahora se redondea a centavos al insertar y
-- al editar la cantidad. Las ventas ya hechas no se tocan.

CREATE OR REPLACE FUNCTION public.editarcantidaddv (
  _id       integer,
  _cantidad numeric
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
BEGIN
  UPDATE detalle_venta
  SET
    cantidad = _cantidad,
    total = round(_cantidad * precio_venta, 2)
  WHERE id = _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insertardetalleventa (
  _id_venta      integer,
  _cantidad      numeric,
  _precio_venta  numeric,
  _id_producto   integer,
  _precio_compra numeric,
  _descripcion   text,
  _id_sucursal   integer,
  _id_almacen    integer
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$BEGIN
    -- Verificar si el producto ya existe en el detalle de venta
    IF EXISTS (
        SELECT 1
        FROM detalle_venta
        WHERE id_venta = _id_venta
          AND id_producto = _id_producto
          AND id_almacen = _id_almacen
    ) THEN
        -- Si existe, actualizar la cantidad y el total
        UPDATE detalle_venta
        SET cantidad = cantidad + _cantidad,
            total = round((cantidad + _cantidad) * _precio_venta, 2)
        WHERE id_venta = _id_venta
          AND id_producto = _id_producto
          AND id_almacen = _id_almacen;
    ELSE
        -- Si no existe, insertar un nuevo registro
        INSERT INTO detalle_venta (
            id_venta, id_producto, cantidad, precio_venta,
            precio_compra, descripcion, total, id_sucursal,id_almacen
        ) VALUES (
            _id_venta, _id_producto, _cantidad, _precio_venta,
            _precio_compra, _descripcion, round(_cantidad * _precio_venta, 2), _id_sucursal,_id_almacen
        );
    END IF;
END;$function$;
