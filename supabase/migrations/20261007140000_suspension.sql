-- ============================================================================
-- Suspensión de la cuenta de una joyería cliente (por ejemplo, por falta de
-- pago). La pone y la quita solo el dueño del sistema, igual que el plan:
--
--   update licencia set suspendida = true,
--          mensaje_suspension = 'Tu cuenta está suspendida por falta de pago.';
--   update licencia set suspendida = false;
--
-- Mientras está suspendida:
--   * Nadie del personal pasa los chequeos de la base (admin_es_personal,
--     admin_rol_actual, admin_tiene_modulo y admin_ve_costos dan "no"): el
--     admin no puede leer ni escribir nada.
--   * licencia_tiene() da false para todo: no corren los crons de la tienda
--     ni de Mercado Libre, y el panel de pedidos/ML queda bloqueado.
--   * El admin y la tienda leen licencia_estado() (también sin sesión) y
--     muestran el aviso en lugar de la app.
-- Los datos no se tocan: al quitar la suspensión todo vuelve como estaba.
-- ============================================================================


ALTER TABLE public.licencia
  ADD COLUMN IF NOT EXISTS suspendida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mensaje_suspension text;


CREATE OR REPLACE FUNCTION public.licencia_suspendida()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT suspendida FROM licencia WHERE id = 1), false);
$$;

-- Lo que necesitan el admin y la tienda para decidir qué mostrar.
CREATE OR REPLACE FUNCTION public.licencia_estado()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'plan', licencia_plan(),
    'suspendida', licencia_suspendida(),
    'mensaje', (SELECT mensaje_suspension FROM licencia WHERE id = 1)
  );
$$;

REVOKE ALL ON FUNCTION public.licencia_suspendida() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencia_estado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.licencia_suspendida() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.licencia_estado() TO anon, authenticated, service_role;


-- Mismo cuerpo que en 20260929140000_mercadolibre_panel.sql + suspensión.
CREATE OR REPLACE FUNCTION public.admin_es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT licencia_suspendida()
     AND EXISTS (
       SELECT 1 FROM usuarios
        WHERE id_auth = auth.uid()::text
          AND estado = 'ACTIVO'
     );
$$;

-- Mismo cuerpo que en 20261005120000_roles_finos.sql + suspensión. De esta
-- salen admin_es_gerente, admin_es_superadmin y admin_tiene_modulo.
CREATE OR REPLACE FUNCTION public.admin_rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.id_rol
   WHERE u.id_auth = auth.uid()::text
     AND u.estado = 'ACTIVO'
     AND NOT licencia_suspendida()
   LIMIT 1;
$$;

-- Mismo cuerpo que en 20261005120000_roles_finos.sql + suspensión: la rama
-- "tiene el módulo asignado" no pasa por admin_rol_actual.
CREATE OR REPLACE FUNCTION public.admin_tiene_modulo(ids integer[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT admin_es_gerente()
      OR (NOT licencia_suspendida()
          AND EXISTS (
            SELECT 1
              FROM usuarios u
              JOIN permisos p ON p.id_usuario = u.id
             WHERE u.id_auth = auth.uid()::text
               AND u.estado = 'ACTIVO'
               AND p.idmodulo = ANY (ids)
          ));
$$;

-- Mismo cuerpo que en 20261006120000_ocultar_costo.sql + suspensión.
CREATE OR REPLACE FUNCTION public.admin_ve_costos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT admin_es_gerente()
      OR (NOT licencia_suspendida()
          AND EXISTS (
            SELECT 1
              FROM usuarios u
              JOIN permisos p ON p.id_usuario = u.id
              JOIN modulos m  ON m.id = p.idmodulo
             WHERE u.id_auth = auth.uid()::text
               AND u.estado = 'ACTIVO'
               AND m.nombre = 'Ver costos'
          ));
$$;

-- Mismo cuerpo que en 20261007120000_licencia_planes.sql + suspensión.
CREATE OR REPLACE FUNCTION public.licencia_tiene(_funcion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT licencia_suspendida()
     AND CASE _funcion
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
  IF licencia_suspendida() THEN
    RAISE EXCEPTION 'La cuenta está suspendida'
      USING ERRCODE = '42501';
  END IF;
  IF NOT licencia_tiene(_funcion) THEN
    RAISE EXCEPTION 'Tu plan no incluye esta función'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
