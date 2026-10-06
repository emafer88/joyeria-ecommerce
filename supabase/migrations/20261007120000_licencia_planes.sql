-- ============================================================================
-- Planes: qué funciones contrató la joyería de este proyecto.
--
-- Cada joyería cliente tiene su propio proyecto de Supabase, y su plan vive
-- en la tabla `licencia` (una sola fila). Planes escalonados:
--   * basico   : admin/POS.
--   * tienda   : basico + tienda en línea (pedidos, envío, banners,
--                notificaciones de pedidos, Mercado Pago).
--   * completo : tienda + Mercado Libre.
--
-- Solo el dueño del sistema cambia el plan (SQL con la llave de servicio o el
-- panel de Supabase): ni anon ni authenticated pueden escribir en `licencia`,
-- ni siquiera el superadmin de la joyería. El admin y la tienda solo leen.
--
-- Esta joyería (la original) queda en 'completo': no cambia nada de lo que ya
-- funciona.
-- ============================================================================


CREATE TABLE IF NOT EXISTS public.licencia (
  id          smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  plan        text        NOT NULL DEFAULT 'basico'
                          CHECK (plan IN ('basico', 'tienda', 'completo')),
  actualizado timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.licencia (id, plan) VALUES (1, 'completo')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.licencia ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.licencia FROM anon, authenticated;
GRANT SELECT ON public.licencia TO anon, authenticated;
GRANT ALL ON public.licencia TO service_role;

DROP POLICY IF EXISTS licencia_ver ON public.licencia;
CREATE POLICY licencia_ver ON public.licencia
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.licencia_actualizado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.actualizado := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS licencia_actualizado ON public.licencia;
CREATE TRIGGER licencia_actualizado
  BEFORE UPDATE ON public.licencia
  FOR EACH ROW EXECUTE FUNCTION public.licencia_actualizado();


-- ----------------------------------------------------------------------------
-- Helpers. Sin fila de licencia, el plan es 'basico'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.licencia_plan()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT plan FROM licencia WHERE id = 1), 'basico');
$$;

-- _funcion: 'tienda' o 'mercadolibre'.
CREATE OR REPLACE FUNCTION public.licencia_tiene(_funcion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE _funcion
           WHEN 'tienda'       THEN licencia_plan() IN ('tienda', 'completo')
           WHEN 'mercadolibre' THEN licencia_plan() = 'completo'
           ELSE false
         END;
$$;

CREATE OR REPLACE FUNCTION public.licencia_exigir(_funcion text)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT licencia_tiene(_funcion) THEN
    RAISE EXCEPTION 'Tu plan no incluye esta función'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.licencia_plan() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencia_tiene(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencia_exigir(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.licencia_plan() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.licencia_tiene(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.licencia_exigir(text) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Panel de pedidos del ecommerce: exige plan con tienda. Se toma el cuerpo
-- actual de pg_get_functiondef (como en 20261005120000_roles_finos.sql):
--   * las de lectura filtran con `admin_es_personal()` en el WHERE: se le
--     suma licencia_tiene('tienda') (sin plan, no devuelven nada);
--   * las que escriben llaman `PERFORM admin_exigir_personal();`: se le
--     suma licencia_exigir('tienda') (sin plan, error).
-- Si ya tiene el chequeo, no se toca.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  def text;
  nuevo text;
BEGIN
  FOR r IN
    SELECT p.oid
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('admin_listar_pedidos_ecommerce',
                         'admin_detalle_pedido_ecommerce',
                         'admin_listar_notificaciones_pedidos',
                         'admin_actualizar_estado_envio',
                         'admin_marcar_notificacion_leida')
  LOOP
    def := pg_get_functiondef(r.oid);
    CONTINUE WHEN def LIKE '%licencia_%';
    nuevo := replace(def, 'AND admin_es_personal()',
                     'AND admin_es_personal() AND public.licencia_tiene(''tienda'')');
    nuevo := replace(nuevo, 'PERFORM admin_exigir_personal();',
                     E'PERFORM admin_exigir_personal();\n  PERFORM public.licencia_exigir(''tienda'');');
    IF nuevo = def THEN
      RAISE EXCEPTION 'No se pudo agregar el chequeo de plan a %', r.oid::regprocedure;
    END IF;
    EXECUTE nuevo;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- Panel de Mercado Libre: todas las ml_admin_* llaman a este chequeo.
-- Mismo cuerpo que en 20261005120000_roles_finos.sql + el plan.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_admin_exigir_personal()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT admin_es_gerente() THEN
    RAISE EXCEPTION 'Solo un administrador puede ver Mercado Libre'
      USING ERRCODE = '42501';
  END IF;
  PERFORM licencia_exigir('mercadolibre');
END;
$$;
