-- ============================================================================
-- Mercado Libre, Fase 2: publicar cada pieza de joyería disponible como una
-- publicación de ML (cantidad 1) y mantenerla sincronizada.
-- ============================================================================
-- La lógica vive en la Edge Function ml-sincronizar (repo joyeria-mercadolibre).
-- Es idempotente: compara el estado deseado (piezas + config) contra
-- ml_publicaciones y corrige las diferencias en ML. Por eso se despliega con
-- verify_jwt=false, igual que liberar-reservas-vencidas: el body solo acota
-- qué revisar, llamarla de más no hace daño.
--
-- Disparadores:
--   * trigger en piezas_inventario: al cambiar estado/precio/talla/peso de una
--     pieza (venta en POS, reserva web, etc.) -> sincroniza esa pieza. pg_net
--     encola el request y recién sale al hacer COMMIT, así que un rollback no
--     dispara nada.
--   * trigger en ml_config_producto: al activar/desactivar un producto.
--   * cron cada 15 min: reconciliación completa + refresh del token de ML
--     (vence cada 6 h). Solo el cron refresca el token: el refresh_token de ML
--     es de un solo uso y dos refresh en paralelo se invalidarían entre sí.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ----------------------------------------------------------------------------
-- 1) Cuenta de ML conectada (una sola fila: una empresa, un vendedor).
--    Solo service_role: RLS activo y sin policies.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_cuenta (
  id            smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ml_user_id    bigint      NOT NULL,
  access_token  text        NOT NULL,
  refresh_token text        NOT NULL,
  expira_en     timestamptz NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_cuenta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_cuenta FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2) Qué diseños se publican y con qué categoría/atributos de ML.
--    atributos = atributos fijos del diseño, formato de la API de ML:
--    [{"id":"BRAND","value_name":"..."}, {"id":"GENDER","value_name":"Mujer"}]
--    SELLER_SKU (y SIZE si la pieza tiene talla) los agrega la función por pieza.
--    Por ahora se carga por SQL; el panel del admin llega en la Fase 6.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_config_producto (
  id_producto    integer     PRIMARY KEY REFERENCES public.productos(id) ON DELETE CASCADE,
  publicar       boolean     NOT NULL DEFAULT false,
  ml_category_id text        NOT NULL,
  atributos      jsonb       NOT NULL DEFAULT '[]'::jsonb
                             CHECK (jsonb_typeof(atributos) = 'array'),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_config_producto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_config_producto FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3) Una fila por pieza publicada (o en proceso de publicarse).
--    creando_desde: "lock" para que dos ejecuciones concurrentes (trigger +
--    cron) no creen dos publicaciones para la misma pieza. Ver
--    ml_reclamar_pieza.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_publicaciones (
  id                 serial      PRIMARY KEY,
  id_pieza           integer     NOT NULL UNIQUE REFERENCES public.piezas_inventario(id) ON DELETE CASCADE,
  ml_item_id         text        UNIQUE,
  ml_user_product_id text,
  estado_ml          text,
  precio_publicado   numeric(12,2),
  creando_desde      timestamptz,
  ultimo_error       text,
  sincronizado_en    timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_publicaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_publicaciones FROM anon, authenticated;

COMMENT ON COLUMN public.ml_publicaciones.estado_ml IS
  'Último estado conocido en ML: active | paused | closed.';


-- ----------------------------------------------------------------------------
-- 4) Reclamo atómico antes de crear una publicación. Devuelve true solo a la
--    primera ejecución; las demás ven creando_desde reciente y se saltean la
--    pieza. Si la creación falla a mitad, el lock vence a los 5 minutos y el
--    próximo cron reintenta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_reclamar_pieza(_id_pieza integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  INSERT INTO ml_publicaciones (id_pieza) VALUES (_id_pieza)
  ON CONFLICT (id_pieza) DO NOTHING;

  UPDATE ml_publicaciones
     SET creando_desde = now(), updated_at = now()
   WHERE id_pieza = _id_pieza
     AND ml_item_id IS NULL
     AND (creando_desde IS NULL OR creando_desde < now() - interval '5 minutes')
  RETURNING true INTO v_ok;

  RETURN coalesce(v_ok, false);
END;
$$;
REVOKE ALL ON FUNCTION public.ml_reclamar_pieza(integer) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5) Llamada a la Edge Function. Nunca debe romper la transacción que la
--    dispara (una venta en el POS no puede fallar porque ML no responda):
--    cualquier error se degrada a WARNING y el cron lo corrige después.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_pedir_sincronizacion(_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://yuyjoupristotpnnblva.supabase.co/functions/v1/ml-sincronizar',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := _body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ml_pedir_sincronizacion(%): %', _body, SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_pedir_sincronizacion(jsonb) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.ml_trg_pieza()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo piezas de diseños configurados para ML, o que ya tienen publicación
  -- (p. ej. el diseño se desactivó pero hay que pausar lo publicado).
  IF EXISTS (SELECT 1 FROM ml_config_producto WHERE id_producto = NEW.id_producto)
     OR EXISTS (SELECT 1 FROM ml_publicaciones WHERE id_pieza = NEW.id) THEN
    PERFORM ml_pedir_sincronizacion(jsonb_build_object('id_pieza', NEW.id));
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ml_sincronizar_pieza_ins ON public.piezas_inventario;
CREATE TRIGGER ml_sincronizar_pieza_ins
  AFTER INSERT ON public.piezas_inventario
  FOR EACH ROW EXECUTE FUNCTION public.ml_trg_pieza();

DROP TRIGGER IF EXISTS ml_sincronizar_pieza_upd ON public.piezas_inventario;
CREATE TRIGGER ml_sincronizar_pieza_upd
  AFTER UPDATE OF estado, precio_venta, precio_oferta, talla, peso ON public.piezas_inventario
  FOR EACH ROW
  WHEN (
    OLD.estado        IS DISTINCT FROM NEW.estado
    OR OLD.precio_venta  IS DISTINCT FROM NEW.precio_venta
    OR OLD.precio_oferta IS DISTINCT FROM NEW.precio_oferta
    OR OLD.talla         IS DISTINCT FROM NEW.talla
    OR OLD.peso          IS DISTINCT FROM NEW.peso
  )
  EXECUTE FUNCTION public.ml_trg_pieza();


CREATE OR REPLACE FUNCTION public.ml_trg_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM ml_pedir_sincronizacion(jsonb_build_object('id_producto', NEW.id_producto));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ml_sincronizar_config ON public.ml_config_producto;
CREATE TRIGGER ml_sincronizar_config
  AFTER INSERT OR UPDATE ON public.ml_config_producto
  FOR EACH ROW EXECUTE FUNCTION public.ml_trg_config();


-- ----------------------------------------------------------------------------
-- 6) Cron: reconciliación completa + refresh de token.
-- ----------------------------------------------------------------------------
SELECT cron.unschedule('ml-sincronizar')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ml-sincronizar');

SELECT cron.schedule(
    'ml-sincronizar',
    '*/15 * * * *',
    $$ SELECT public.ml_pedir_sincronizacion('{"completa": true}'::jsonb); $$
);
