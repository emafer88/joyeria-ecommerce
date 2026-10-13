-- ============================================================================
-- Botón "Conectar Mercado Libre" en el admin (antes la cuenta se conectaba a
-- mano con fase1/ml.mjs de joyeria-mercadolibre).
--
-- Flujo: el admin pide un `state` con ml_admin_iniciar_conexion() y abre la
-- Edge Function ml-oauth?iniciar=<state>, que redirige al login de ML. ML
-- vuelve a ml-oauth con ?code&state; la función valida y consume el state,
-- canjea el code, guarda ml_cuenta y regresa al admin (volver_a).
--
-- El state es de un solo uso, vence a los 15 min y solo lo puede pedir un
-- gerente con plan Completo: así nadie puede conectar su propia cuenta de ML
-- a la joyería de otro.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_oauth_estado (
  state      text        PRIMARY KEY,
  id_auth    uuid        NOT NULL,
  volver_a   text        NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
-- Solo service_role (la Edge Function).
ALTER TABLE public.ml_oauth_estado ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_oauth_estado FROM anon, authenticated;


CREATE OR REPLACE FUNCTION public.ml_admin_iniciar_conexion(_volver_a text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_state text := encode(gen_random_bytes(24), 'hex');
BEGIN
  PERFORM ml_admin_exigir_personal();
  PERFORM licencia_exigir('mercadolibre');

  IF _volver_a IS NULL OR _volver_a !~ '^https?://[^/]+(/.*)?$' THEN
    RAISE EXCEPTION 'Dirección de regreso inválida' USING ERRCODE = '22023';
  END IF;

  DELETE FROM ml_oauth_estado WHERE creado_en < now() - interval '15 minutes';
  INSERT INTO ml_oauth_estado (state, id_auth, volver_a)
  VALUES (v_state, auth.uid(), _volver_a);
  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_admin_iniciar_conexion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_admin_iniciar_conexion(text) TO authenticated, service_role;
