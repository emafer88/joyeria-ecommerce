-- Diseño editable de la tienda (Configuración → Diseño de la tienda en el
-- admin): paleta, orden/visibilidad y textos de las secciones del inicio,
-- contacto y redes. Se guarda como un solo jsonb; la forma y los valores por
-- defecto viven en el front de la tienda (src/data/disenoTienda.ts), que
-- completa lo que falte, así que '{}' es "todo como viene de fábrica".

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS diseno_tienda jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Tarjeta en Configuraciones + permiso para superadmin/admin.
INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Diseño de la tienda', 'colores, secciones, textos y contacto del ecommerce',
       '/iconos/tienda.svg', '/configuracion/tienda', '#configuracion'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE link = '/configuracion/tienda');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id, m.id
  FROM public.usuarios u
  JOIN public.roles r ON r.id = u.id_rol AND r.nombre IN ('superadmin', 'admin')
 CROSS JOIN public.modulos m
 WHERE m.link = '/configuracion/tienda'
   AND NOT EXISTS (SELECT 1 FROM public.permisos p
                    WHERE p.id_usuario = u.id AND p.idmodulo = m.id);

-- Lectura pública (la tienda la pide sin sesión).
CREATE OR REPLACE FUNCTION public.ecommerce_diseno()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(diseno_tienda, '{}'::jsonb)
    FROM empresa
   WHERE id = ecommerce_id_empresa();
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_diseno() TO anon, authenticated, service_role;

-- Guardar: con permiso del módulo. La tienda muestra los textos como texto
-- (nunca HTML) y solo usa enlaces http(s), así que acá basta con validar la
-- forma general y el tamaño.
CREATE OR REPLACE FUNCTION public.admin_guardar_diseno_tienda(_id_empresa bigint, _diseno jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM admin_exigir_modulo(ARRAY(
    SELECT id::integer FROM modulos WHERE link = '/configuracion/tienda'));

  IF jsonb_typeof(_diseno) IS DISTINCT FROM 'object'
     OR (_diseno ? 'secciones' AND jsonb_typeof(_diseno->'secciones') <> 'array')
     OR (_diseno ? 'contacto' AND jsonb_typeof(_diseno->'contacto') <> 'object')
     OR pg_column_size(_diseno) > 32768 THEN
    RAISE EXCEPTION 'Diseño inválido' USING ERRCODE = '22023';
  END IF;

  UPDATE empresa SET diseno_tienda = _diseno WHERE id = _id_empresa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_guardar_diseno_tienda(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_guardar_diseno_tienda(bigint, jsonb) TO authenticated;
