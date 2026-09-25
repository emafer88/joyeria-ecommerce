-- ============================================================================
-- Mercado Libre: publicar por GRUPO de piezas idénticas, no por pieza.
-- ============================================================================
-- En el modelo User Products de ML, dos publicaciones con el mismo
-- family_name y los mismos atributos son el MISMO producto y comparten stock
-- (probado: 8 piezas publicadas por separado quedaron con 1 sola unidad de
-- stock entre todas). El peso no las diferencia; el atributo MODEL sí.
--
-- Entonces: las piezas disponibles del mismo diseño + variante + peso + talla
-- + precio efectivo forman un grupo = 1 publicación con available_quantity =
-- cantidad de piezas. Cada grupo lleva un MODEL único dentro del diseño
-- ("Tipo Cartier 8 g", "Tipo Cartier 8 g · B"...) para que ML no los junte.
-- Una venta por ML (Fase 3) asigna cualquier pieza disponible del grupo.
--
-- Reemplaza ml_publicaciones / ml_reclamar_pieza de
-- 20260924120000_mercadolibre_sincronizacion.sql. Las 10 publicaciones que
-- se alcanzaron a crear con ese esquema (cuenta de prueba) ya se cerraron a
-- mano en ML, así que las filas se descartan.
-- ============================================================================

DROP FUNCTION IF EXISTS public.ml_reclamar_pieza(integer);
DROP TABLE IF EXISTS public.ml_publicaciones;

CREATE TABLE public.ml_publicaciones (
  id                 serial      PRIMARY KEY,
  id_producto        integer     NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  -- "<id_variante>|<peso>|<talla>|<precio efectivo>", la arma ml-sincronizar.
  clave_grupo        text        NOT NULL,
  -- Valor del atributo MODEL en ML. Nunca se reutiliza dentro del diseño:
  -- reusarlo metería el grupo nuevo en el User Product de uno viejo.
  modelo             text        NOT NULL,
  ml_item_id         text        UNIQUE,
  ml_user_product_id text,
  estado_ml          text,
  cantidad_publicada integer,
  precio_publicado   numeric(12,2),
  creando_desde      timestamptz,
  ultimo_error       text,
  sincronizado_en    timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_producto, clave_grupo),
  UNIQUE (id_producto, modelo)
);
ALTER TABLE public.ml_publicaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_publicaciones FROM anon, authenticated;

COMMENT ON COLUMN public.ml_publicaciones.estado_ml IS
  'Último estado conocido en ML: active | paused | closed | under_review.';


-- ----------------------------------------------------------------------------
-- Reclamo atómico antes de crear la publicación de un grupo. Asigna el
-- modelo (primer libre entre base, base · B, base · C...) la primera vez.
-- Devuelve el modelo si esta ejecución debe crear la publicación, NULL si
-- otra ya la está creando o ya existe. El advisory lock por diseño evita que
-- dos grupos nuevos se lleven el mismo modelo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_reclamar_grupo(
  _id_producto integer,
  _clave_grupo text,
  _modelo_base text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modelo  text;
  v_sufijo  integer := 0;
  v_reclamo text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ml_grupo'), _id_producto);

  IF NOT EXISTS (SELECT 1 FROM ml_publicaciones
                  WHERE id_producto = _id_producto AND clave_grupo = _clave_grupo) THEN
    LOOP
      v_modelo := CASE WHEN v_sufijo = 0 THEN _modelo_base
                       ELSE _modelo_base || ' · ' || chr(65 + v_sufijo) END;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM ml_publicaciones
                             WHERE id_producto = _id_producto AND modelo = v_modelo);
      v_sufijo := v_sufijo + 1;
    END LOOP;
    INSERT INTO ml_publicaciones (id_producto, clave_grupo, modelo)
    VALUES (_id_producto, _clave_grupo, v_modelo);
  END IF;

  UPDATE ml_publicaciones
     SET creando_desde = now(), updated_at = now()
   WHERE id_producto = _id_producto
     AND clave_grupo = _clave_grupo
     AND ml_item_id IS NULL
     AND (creando_desde IS NULL OR creando_desde < now() - interval '5 minutes')
  RETURNING modelo INTO v_reclamo;

  RETURN v_reclamo;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_reclamar_grupo(integer, text, text) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- El trigger de piezas ahora sincroniza el DISEÑO entero: una pieza que
-- cambia de precio/peso sale de un grupo y entra en otro, se revisan los dos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_trg_pieza()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ml_config_producto WHERE id_producto = NEW.id_producto)
     OR EXISTS (SELECT 1 FROM ml_publicaciones WHERE id_producto = NEW.id_producto) THEN
    PERFORM ml_pedir_sincronizacion(jsonb_build_object('id_producto', NEW.id_producto));
  END IF;
  RETURN NULL;
END;
$$;
