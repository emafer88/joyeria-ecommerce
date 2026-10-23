-- Paleta de colores del panel admin, elegida por empresa desde
-- Configuración → Apariencia. Las paletas listas viven en el front
-- (src/styles/paletas.jsx); acá solo se guarda cuál se eligió y, si es la
-- personalizada, su color:
--   {"id": "clasica"}  |  {"id": "personalizada", "acento": "#1a7f5a"}
-- Claro/oscuro sigue siendo por usuario (usuarios.tema).

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS paleta_admin jsonb NOT NULL DEFAULT '{"id": "clasica"}'::jsonb;

-- Tarjeta en Configuraciones + permiso para superadmin/admin (mismo criterio
-- que "Autorizar cancelaciones"). Sin UNIQUE en modulos.link: WHERE NOT EXISTS.
INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Apariencia', 'elige la paleta de colores del panel',
       '/iconos/paleta.svg', '/configuracion/apariencia', '#configuracion'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE link = '/configuracion/apariencia');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id, m.id
  FROM public.usuarios u
  JOIN public.roles r ON r.id = u.id_rol AND r.nombre IN ('superadmin', 'admin')
 CROSS JOIN public.modulos m
 WHERE m.link = '/configuracion/apariencia'
   AND NOT EXISTS (SELECT 1 FROM public.permisos p
                    WHERE p.id_usuario = u.id AND p.idmodulo = m.id);

-- Guardar la paleta: la policy de UPDATE de empresa es por los módulos de
-- "Empresa" (3, 19, 20), así que va por RPC con su propio chequeo.
CREATE OR REPLACE FUNCTION public.admin_guardar_paleta(_id_empresa bigint, _paleta jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM admin_exigir_modulo(ARRAY(
    SELECT id::integer FROM modulos WHERE link = '/configuracion/apariencia'));

  IF jsonb_typeof(_paleta) IS DISTINCT FROM 'object'
     OR coalesce(_paleta->>'id', '') !~ '^[a-z]{1,30}$'
     OR (_paleta->>'id' = 'personalizada'
         AND coalesce(_paleta->>'acento', '') !~* '^#[0-9a-f]{6}$') THEN
    RAISE EXCEPTION 'Paleta inválida' USING ERRCODE = '22023';
  END IF;

  UPDATE empresa
     SET paleta_admin = CASE WHEN _paleta->>'id' = 'personalizada'
                             THEN jsonb_build_object('id', 'personalizada',
                                                     'acento', lower(_paleta->>'acento'))
                             ELSE jsonb_build_object('id', _paleta->>'id')
                        END
   WHERE id = _id_empresa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_guardar_paleta(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_guardar_paleta(bigint, jsonb) TO authenticated;
