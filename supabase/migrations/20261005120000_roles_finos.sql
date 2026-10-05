-- ============================================================================
-- Seguridad: roles finos.
--
-- Hasta 20261001120000_seguridad_rls.sql la base solo preguntaba "¿es personal
-- activo?": un cajero, con su sesión y la anon key, podía por REST cambiarse
-- el rol a superadmin, darse módulos, editar precios, empresa, usuarios, el
-- panel de Mercado Libre... aunque la app no le mostrara esas pantallas.
--
-- Ahora la base sigue las mismas reglas que la app:
--   * Gerente = rol superadmin o admin. Puede todo.
--   * Operación del POS (ventas, caja, stock, piezas, clientes, folios,
--     pedidos): todo el personal lee y escribe.
--   * Catálogo y configuración: todo el personal lee; escribe un gerente o
--     quien tenga asignado el módulo de esa pantalla (tabla `permisos`, lo
--     que se marca en "Personal").
--   * Usuarios, permisos, roles, módulos, banners, Mercado Libre y crear
--     credenciales: solo gerente. Cada quien edita su propio perfil, pero no
--     su rol/estado/correo/id_auth. Solo un superadmin asigna el rol
--     superadmin o toca a otro superadmin.
--
-- Los ids de módulos son los de la tabla `modulos` (1 Categorías,
-- 2 Productos, 3/19/20 Empresa, 6 Métodos de pago, 7 Sucursales y cajas,
-- 21 Almacenes, 23 Inventarios, 25 Serialización).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER para poder leer usuarios/permisos/roles sin
-- depender de las policies (y sin recursión cuando se usan en ellas).
-- ----------------------------------------------------------------------------
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
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_es_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(admin_rol_actual() IN ('superadmin', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.admin_es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(admin_rol_actual() = 'superadmin', false);
$$;

-- Gerente, o personal activo con alguno de esos módulos asignados.
CREATE OR REPLACE FUNCTION public.admin_tiene_modulo(ids integer[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT admin_es_gerente()
      OR EXISTS (
        SELECT 1
          FROM usuarios u
          JOIN permisos p ON p.id_usuario = u.id
         WHERE u.id_auth = auth.uid()::text
           AND u.estado = 'ACTIVO'
           AND p.idmodulo = ANY (ids)
      );
$$;

CREATE OR REPLACE FUNCTION public.admin_exigir_gerente()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT admin_es_gerente() THEN
    RAISE EXCEPTION 'Solo un administrador puede hacer esto'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_exigir_modulo(ids integer[])
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT admin_tiene_modulo(ids) THEN
    RAISE EXCEPTION 'No tienes permiso para esta sección'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_rol_actual()', 'public.admin_es_gerente()',
    'public.admin_es_superadmin()', 'public.admin_tiene_modulo(integer[])',
    'public.admin_exigir_gerente()', 'public.admin_exigir_modulo(integer[])'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- Catálogo y configuración: lectura para todo el personal, escritura para
-- gerente o quien tenga el módulo. Reemplaza la policy personal_todo.
-- (Las tablas de operación del POS se quedan con personal_todo.)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  m text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('categorias',                 ARRAY[1]),
      ('productos',                  ARRAY[2]),
      ('producto_imagenes',          ARRAY[2]),
      ('producto_variante_imagenes', ARRAY[2]),
      ('producto_etiquetas',         ARRAY[2]),
      ('etiquetas',                  ARRAY[2]),
      ('multiprecios',               ARRAY[2]),
      ('marca',                      ARRAY[2]),
      -- crear_piezas_masivo actualiza la variante (Inventarios).
      ('producto_variantes',         ARRAY[2, 23]),
      ('metodos_pago',               ARRAY[6]),
      ('sucursales',                 ARRAY[7]),
      ('caja',                       ARRAY[7]),
      ('asignacion_sucursal',        ARRAY[7]),
      ('almacen',                    ARRAY[21]),
      ('tipo_comprobantes',          ARRAY[25]),
      -- Solo gerente (ningún módulo alcanza).
      ('permisos',                   ARRAY[]::integer[]),
      ('permisos_dafault',           ARRAY[]::integer[]),
      ('roles',                      ARRAY[]::integer[]),
      ('modulos',                    ARRAY[]::integer[]),
      ('tipodocumento',              ARRAY[]::integer[]),
      ('banners',                    ARRAY[]::integer[])
    ) AS t(tabla, modulos)
  LOOP
    m := format('(SELECT admin_tiene_modulo(%L::integer[]))', r.modulos);
    EXECUTE format('DROP POLICY personal_todo ON public.%I', r.tabla);
    EXECUTE format(
      'CREATE POLICY personal_ver ON public.%I FOR SELECT TO authenticated '
      'USING ((SELECT admin_es_personal()))', r.tabla);
    EXECUTE format(
      'CREATE POLICY modulo_insertar ON public.%I FOR INSERT TO authenticated '
      'WITH CHECK (%s)', r.tabla, m);
    EXECUTE format(
      'CREATE POLICY modulo_editar ON public.%I FOR UPDATE TO authenticated '
      'USING (%s) WITH CHECK (%s)', r.tabla, m, m);
    EXECUTE format(
      'CREATE POLICY modulo_borrar ON public.%I FOR DELETE TO authenticated '
      'USING (%s)', r.tabla, m);
  END LOOP;
END $$;

-- empresa: ya era solo SELECT/UPDATE para personal; ahora UPDATE por módulo.
DROP POLICY personal_editar ON public.empresa;
CREATE POLICY modulo_editar ON public.empresa FOR UPDATE TO authenticated
  USING ((SELECT admin_tiene_modulo(ARRAY[3, 19, 20])))
  WITH CHECK ((SELECT admin_tiene_modulo(ARRAY[3, 19, 20])));

-- piezas_inventario: el POS las actualiza al vender/reservar/liberar (todo el
-- personal); darlas de alta o borrarlas es de Productos/Inventarios.
DROP POLICY personal_todo ON public.piezas_inventario;
CREATE POLICY personal_ver ON public.piezas_inventario FOR SELECT TO authenticated
  USING ((SELECT admin_es_personal()));
CREATE POLICY personal_editar ON public.piezas_inventario FOR UPDATE TO authenticated
  USING ((SELECT admin_es_personal()))
  WITH CHECK ((SELECT admin_es_personal()));
CREATE POLICY modulo_insertar ON public.piezas_inventario FOR INSERT TO authenticated
  WITH CHECK ((SELECT admin_tiene_modulo(ARRAY[2, 23])));
CREATE POLICY modulo_borrar ON public.piezas_inventario FOR DELETE TO authenticated
  USING ((SELECT admin_tiene_modulo(ARRAY[2, 23])));


-- ----------------------------------------------------------------------------
-- usuarios: todo el personal ve la lista (asignaciones, reportes...), el
-- gerente da altas/bajas y edita, y cada quien edita su propia fila (perfil,
-- tema). Qué columnas puede tocar cada uno lo cuida el trigger de abajo.
-- ----------------------------------------------------------------------------
DROP POLICY personal_todo ON public.usuarios;
CREATE POLICY personal_ver ON public.usuarios FOR SELECT TO authenticated
  USING ((SELECT admin_es_personal()));
CREATE POLICY gerente_insertar ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK ((SELECT admin_es_gerente()));
CREATE POLICY gerente_borrar ON public.usuarios FOR DELETE TO authenticated
  USING ((SELECT admin_es_gerente()));
CREATE POLICY gerente_o_propio_editar ON public.usuarios FOR UPDATE TO authenticated
  USING ((SELECT admin_es_gerente()) OR id_auth = (SELECT auth.uid())::text)
  WITH CHECK ((SELECT admin_es_gerente()) OR id_auth = (SELECT auth.uid())::text);

CREATE OR REPLACE FUNCTION public.usuarios_proteger_rol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  rol_superadmin integer;
BEGIN
  -- Sin sesión (service_role, SQL editor, migraciones): sin restricciones.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id INTO rol_superadmin FROM roles WHERE nombre = 'superadmin';

  IF TG_OP = 'UPDATE' AND NOT admin_es_gerente()
     AND (NEW.id_rol  IS DISTINCT FROM OLD.id_rol
       OR NEW.estado  IS DISTINCT FROM OLD.estado
       OR NEW.correo  IS DISTINCT FROM OLD.correo
       OR NEW.id_auth IS DISTINCT FROM OLD.id_auth) THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar rol, estado o correo'
      USING ERRCODE = '42501';
  END IF;

  IF NOT admin_es_superadmin() THEN
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.id_rol = rol_superadmin THEN
      RAISE EXCEPTION 'Solo un superadmin puede modificar a otro superadmin'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.id_rol = rol_superadmin THEN
      RAISE EXCEPTION 'Solo un superadmin puede asignar el rol superadmin'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER usuarios_proteger_rol
  BEFORE INSERT OR UPDATE OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_proteger_rol();


-- ----------------------------------------------------------------------------
-- RPC: chequeo agregado al principio del cuerpo actual de cada función (se
-- toma de pg_get_functiondef para no copiar a mano cuerpos largos y con
-- varias sobrecargas). Si ya tiene el chequeo, no se toca.
--   * Inventarios (crear/ajustar/marcar/devolver piezas): módulo 2 o 23.
--     Reservar/liberar se quedan libres: las usa el POS.
--   * crearcredencialesuser: solo gerente.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  def text;
  partes text[];
BEGIN
  FOR r IN
    SELECT p.oid,
           CASE WHEN p.proname = 'crearcredencialesuser'
                THEN 'PERFORM public.admin_exigir_gerente();'
                ELSE 'PERFORM public.admin_exigir_modulo(ARRAY[2, 23]);'
           END AS chequeo
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('crear_pieza', 'crear_piezas_masivo', 'ajustar_pieza',
                         'marcar_pieza', 'devolver_pieza', 'crearcredencialesuser')
  LOOP
    def := pg_get_functiondef(r.oid);
    CONTINUE WHEN def LIKE '%' || r.chequeo || '%';
    -- Encabezado hasta el primer $function$, y cuerpo: el primer BEGIN del
    -- cuerpo es el del bloque principal (DECLARE no puede tener BEGIN).
    partes := regexp_match(def, '^(.*?\$function\$)(.*)$', 's');
    IF partes IS NULL OR partes[2] !~* '\mbegin\M' THEN
      RAISE EXCEPTION 'No se pudo agregar el chequeo a %', r.oid::regprocedure;
    END IF;
    EXECUTE partes[1] || regexp_replace(partes[2], '\mbegin\M',
      E'BEGIN\n  ' || r.chequeo, 'i');
  END LOOP;
END $$;

-- Panel de Mercado Libre: todas las ml_admin_* llaman a este chequeo.
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
END;
$$;


-- ----------------------------------------------------------------------------
-- Bucket imagenes: subir/editar/borrar solo quien administra algo que lleva
-- imágenes (categorías, productos, empresa, métodos de pago, inventarios) o
-- gerente (banners). La lectura sigue pública.
-- ----------------------------------------------------------------------------
DROP POLICY imagenes_subir_personal ON storage.objects;
DROP POLICY imagenes_editar_personal ON storage.objects;
DROP POLICY imagenes_borrar_personal ON storage.objects;

CREATE POLICY imagenes_subir_modulo ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imagenes'
    AND (SELECT public.admin_tiene_modulo(ARRAY[1, 2, 3, 6, 23])));
CREATE POLICY imagenes_editar_modulo ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imagenes'
    AND (SELECT public.admin_tiene_modulo(ARRAY[1, 2, 3, 6, 23])))
  WITH CHECK (bucket_id = 'imagenes'
    AND (SELECT public.admin_tiene_modulo(ARRAY[1, 2, 3, 6, 23])));
CREATE POLICY imagenes_borrar_modulo ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imagenes'
    AND (SELECT public.admin_tiene_modulo(ARRAY[1, 2, 3, 6, 23])));
