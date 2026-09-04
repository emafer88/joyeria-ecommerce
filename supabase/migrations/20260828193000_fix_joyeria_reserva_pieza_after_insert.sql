-- Fix: la reserva/consumo de una pieza serializada debe ocurrir DESPUÉS de
-- insertar la fila en detalle_venta, no antes.
--
-- El trigger zz_joyeria_detalle_venta_biu era BEFORE INSERT OR UPDATE y dentro
-- hacía `UPDATE piezas_inventario SET id_detalle_venta = NEW.id`. En un trigger
-- BEFORE INSERT la fila de detalle_venta con ese NEW.id todavía no existe, así
-- que el FK piezas_inventario_id_detalle_venta_fkey (-> detalle_venta(id))
-- fallaba y la línea nunca se creaba. Además, al quedar id_detalle_venta en
-- NULL, joyeria_ventas_confirmar_au() (que hace JOIN por id_detalle_venta)
-- nunca marcaba la pieza como 'vendida' al cobrar.
--
-- Solución: el BEFORE solo normaliza cantidad := 1; la reserva de la pieza
-- pasa a un trigger AFTER INSERT OR UPDATE, cuando NEW.id ya es una FK válida.

-- 1) BEFORE: solo normaliza la cantidad de una pieza serializada.
CREATE OR REPLACE FUNCTION public.joyeria_detalle_venta_biu()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.id_pieza IS NOT NULL THEN
    NEW.cantidad := 1;  -- una pieza serializada es siempre 1 unidad
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) AFTER: reserva / consume la pieza (la fila detalle_venta ya existe).
CREATE OR REPLACE FUNCTION public.joyeria_detalle_venta_ai()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE v_emp bigint;
BEGIN
  IF NEW.id_pieza IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.id_pieza IS DISTINCT FROM OLD.id_pieza THEN
    UPDATE piezas_inventario pi
       SET estado = 'reservada',
           id_detalle_venta = NEW.id,
           id_venta_reserva = NEW.id_venta,
           updated_at = now()
     WHERE pi.id = NEW.id_pieza
       AND (
             pi.estado = 'disponible'
          OR (pi.estado = 'reservada' AND pi.id_venta_reserva = NEW.id_venta)
          OR (pi.estado = 'reservada' AND EXISTS (
                SELECT 1 FROM detalle_venta dv
                 WHERE dv.id = pi.id_detalle_venta AND dv.id_venta = NEW.id_venta))
           )
     RETURNING pi.id_empresa INTO v_emp;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La pieza % no está disponible (vendida, reservada por otra venta, perdida o dañada)', NEW.id_pieza;
    END IF;

    INSERT INTO movimientos_piezas (id_pieza, id_empresa, tipo, estado_nuevo,
                                    id_referencia, referencia_tipo, notas)
    VALUES (NEW.id_pieza, v_emp, 'reserva', 'reservada',
            NEW.id_venta, 'venta', 'reserva por línea de venta');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_joyeria_detalle_venta_ai ON public.detalle_venta;
CREATE TRIGGER zz_joyeria_detalle_venta_ai
  AFTER INSERT OR UPDATE ON public.detalle_venta
  FOR EACH ROW
  EXECUTE FUNCTION public.joyeria_detalle_venta_ai();

-- 3) Limpieza: piezas que quedaron 'reservada' por intentos fallidos previos,
--    sin ninguna línea de venta real que las respalde.
UPDATE piezas_inventario pi
   SET estado = 'disponible',
       id_venta_reserva = NULL,
       id_detalle_venta = NULL,
       updated_at = now()
 WHERE pi.estado = 'reservada'
   AND NOT EXISTS (
         SELECT 1 FROM detalle_venta dv
          WHERE dv.id_pieza = pi.id
       );
