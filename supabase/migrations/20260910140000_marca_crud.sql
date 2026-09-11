-- ============================================================================
-- CRUD de marcas / colecciones para el panel (proyecto-joyeria).
-- ============================================================================
-- La tabla `marca` la creó 20260910120000. Faltaba una forma de darla de alta
-- desde el panel: estas funciones son el equivalente de insertar_etiqueta /
-- eliminar_etiqueta (20260910130000). Las funciones legacy insertarmarca /
-- editarmarca quedan como estaban (nadie las llama desde el front nuevo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insertar_marca(_nombre text, _id_empresa integer)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE nuevo_id bigint;
BEGIN
  IF _nombre IS NULL OR btrim(_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre de la marca es obligatorio';
  END IF;
  INSERT INTO marca (nombre, id_empresa)
  VALUES (btrim(_nombre), _id_empresa)
  ON CONFLICT (id_empresa, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id INTO nuevo_id;
  RETURN nuevo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.editar_marca(_id integer, _nombre text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF _nombre IS NULL OR btrim(_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre de la marca es obligatorio';
  END IF;
  UPDATE marca SET nombre = btrim(_nombre), updated_at = now() WHERE id = _id;
END;
$$;

-- Borra la marca y desasocia los productos que la usaban (no hay FK).
CREATE OR REPLACE FUNCTION public.eliminar_marca(_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE productos SET id_marca = NULL WHERE id_marca = _id;
  DELETE FROM marca WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insertar_marca(text, integer) TO anon, authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.editar_marca(integer, text) TO anon, authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_marca(integer) TO anon, authenticated, postgres, service_role;
