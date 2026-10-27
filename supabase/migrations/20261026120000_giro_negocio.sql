-- Giro del negocio: qué funciones de su ramo usa el cliente (piezas con
-- número de serie, venta por peso, apartados, tallas). Va en `licencia`, junto
-- al plan, porque lo decide el dueño del sistema al instalar y el cliente no
-- lo cambia. Por defecto 'joyeria': los proyectos que ya existen quedan igual.
--
-- Qué incluye cada giro lo decide la app (FUNCIONES_POR_GIRO en
-- src/hooks/useLicencia.jsx); la base solo guarda el giro.

ALTER TABLE public.licencia
  ADD COLUMN IF NOT EXISTS giro text NOT NULL DEFAULT 'joyeria'
    CHECK (giro IN ('joyeria', 'ropa', 'abarrotes', 'generico'));

CREATE OR REPLACE FUNCTION public.licencia_giro()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT giro FROM licencia WHERE id = 1), 'joyeria');
$$;

-- Mismo cuerpo que en 20261007140000_suspension.sql + giro.
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
    'suspendida', licencia_suspendida(),
    'mensaje', (SELECT mensaje_suspension FROM licencia WHERE id = 1)
  );
$$;

REVOKE ALL ON FUNCTION public.licencia_giro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.licencia_giro() TO anon, authenticated, service_role;
