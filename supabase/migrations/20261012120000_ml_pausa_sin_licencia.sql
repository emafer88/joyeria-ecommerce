-- ============================================================================
-- Mercado Libre sin licencia: pausar las publicaciones.
--
-- Hasta ahora, si la cuenta se suspendía o el plan dejaba de incluir Mercado
-- Libre, ml_pedir_sincronizacion dejaba de llamar y las publicaciones
-- quedaban activas en ML (con ventas que no se registraban). Ahora:
--
--   * El cron completo ({"completa": true}) llama aunque no haya licencia,
--     siempre que haya una cuenta de ML conectada: ml-sincronizar pausa todo
--     y de paso mantiene vivo el token para cuando se reactive.
--   * Al cambiar plan o suspensión, un trigger pide una sincronización
--     ({"licencia": true}: todo, sin refresh del token) para pausar o
--     reactivar en el momento, sin esperar al cron.
--   * Los triggers de piezas/config siguen sin llamar si no hay licencia.
-- ============================================================================

-- Mismo cuerpo que en 20261007130000_instalacion_limpia.sql, salvo cuándo llama.
CREATE OR REPLACE FUNCTION public.ml_pedir_sincronizacion(_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := licencia_url_funcion('ml-sincronizar');
BEGIN
  IF v_url IS NULL OR NOT EXISTS (SELECT 1 FROM ml_cuenta) THEN
    RETURN;
  END IF;
  IF NOT licencia_tiene('mercadolibre') AND NOT (_body ? 'completa' OR _body ? 'licencia') THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := _body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ml_pedir_sincronizacion(%): %', _body, SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_pedir_sincronizacion(jsonb) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.ml_trg_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_pedir_sincronizacion('{"licencia": true}'::jsonb);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_trg_licencia() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ml_sincronizar_licencia ON public.licencia;
CREATE TRIGGER ml_sincronizar_licencia
  AFTER UPDATE OF plan, suspendida ON public.licencia
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan OR OLD.suspendida IS DISTINCT FROM NEW.suspendida)
  EXECUTE FUNCTION public.ml_trg_licencia();
