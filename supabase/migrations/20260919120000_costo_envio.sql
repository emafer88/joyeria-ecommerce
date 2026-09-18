-- ============================================================================
-- Costo de envío configurable por el admin (proyecto-joyeria → Configuraciones
-- → Envío), leído/cobrado por el ecommerce en el carrito y en el checkout
-- real (crear-preferencia-pago). Un solo valor global por empresa, siguiendo
-- el patrón ya existente de config general en la tabla `empresa` (no hay
-- tabla genérica de parámetros en este proyecto).
-- ============================================================================

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS costo_envio numeric NOT NULL DEFAULT 0;

-- Lectura pública para el ecommerce (RLS de `empresa` no da acceso a anon).
CREATE OR REPLACE FUNCTION public.ecommerce_costo_envio()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT costo_envio FROM empresa WHERE id = public.ecommerce_id_empresa();
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_costo_envio() TO anon, authenticated, service_role;

-- Tarjeta nueva en Configuraciones (panel admin) + permiso para los mismos
-- usuarios que ya tienen acceso a "Empresa"/"Configuración de ticket" (ids 1
-- y 4, confirmado contra la base real). Inserts guardados con WHERE NOT
-- EXISTS: no hay UNIQUE en `modulos.link` para usar ON CONFLICT.
INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Envío', 'configura el costo de envío del ecommerce',
       'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/almacen.png',
       '/configuracion/envio', '#configuracion'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE link = '/configuracion/envio');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id_usuario, m.id
FROM (VALUES (1), (4)) AS u(id_usuario)
CROSS JOIN public.modulos m
WHERE m.link = '/configuracion/envio'
  AND NOT EXISTS (
    SELECT 1 FROM public.permisos p
    WHERE p.id_usuario = u.id_usuario AND p.idmodulo = m.id
  );
