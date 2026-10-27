-- La tienda (sin sesión, no lee `empresa`) necesita saber qué funciones del
-- giro apagó el negocio para ocultar sus filtros. licencia_estado() suma
-- 'apagadas' = empresa.funciones_apagadas de la empresa de la tienda.

-- Mismo cuerpo que en 20261026120000_giro_negocio.sql + apagadas.
CREATE OR REPLACE FUNCTION public.licencia_estado()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'plan', licencia_plan(),
    'giro', licencia_giro(),
    'apagadas', COALESCE((SELECT to_jsonb(funciones_apagadas) FROM empresa
                           WHERE id = ecommerce_id_empresa()), '[]'::jsonb),
    'suspendida', licencia_suspendida(),
    'mensaje', (SELECT mensaje_suspension FROM licencia WHERE id = 1)
  );
$$;
