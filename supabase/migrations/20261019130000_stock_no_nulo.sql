-- stock.stock vacío (NULL) nunca se podía corregir: NULL + cantidad sigue
-- siendo NULL, así que las entradas de inventario se anotaban en el
-- historial pero la existencia no cambiaba. Pasaba al dar de alta un
-- producto con "Controlar stock" y el campo de stock vacío.

UPDATE public.stock SET stock = 0 WHERE stock IS NULL;

ALTER TABLE public.stock
  ALTER COLUMN stock SET DEFAULT 0,
  ALTER COLUMN stock SET NOT NULL;

-- Antes, si no existía el registro de stock no hacía nada y el formulario
-- decía "guardado correctamente".
CREATE OR REPLACE FUNCTION public.incrementarstock (
  _id      integer,
  cantidad numeric
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
BEGIN
  UPDATE stock SET stock = stock + cantidad WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto no tiene stock en este almacén';
  END IF;
END;
$function$;
