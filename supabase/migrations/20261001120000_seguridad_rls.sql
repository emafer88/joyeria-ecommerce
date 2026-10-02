-- ============================================================================
-- Seguridad: RLS en todas las tablas del admin.
--
-- Antes de esto, 34 tablas de `public` no tenían RLS y `anon`/`authenticated`
-- tenían todos los permisos (los grants por defecto de Supabase): con la anon
-- key pública (va en el bundle del ecommerce) se podían leer y modificar
-- ventas, usuarios, clientes, precios... Y las pocas policies que había eran
-- `authenticated USING (true)`, o sea que cualquier cliente logueado del
-- ecommerce también podía modificar piezas y variantes.
--
-- Quién accede a qué después de esta migración:
--   * Personal del admin (fila ACTIVA en `usuarios`, ver admin_es_personal()):
--     todo, como hasta ahora.
--   * Clientes del ecommerce: solo sus tablas propias (ecommerce_direccion,
--     ecommerce_favorito, ...) que ya tenían sus policies, y las RPC
--     ecommerce_* (SECURITY DEFINER, no les afecta RLS).
--   * anon: nada de tablas salvo cp_mexico (lectura); solo RPC ecommerce_*.
--   * service_role (edge functions de Mercado Pago / Mercado Libre) y los
--     cron: no les afecta RLS.
--
-- OJO para migraciones futuras: toda tabla nueva en `public` tiene que nacer
-- con RLS activado y sus policies; los grants por defecto de Supabase le dan
-- todo a anon/authenticated.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Tablas que usa solo el admin: RLS + una policy "solo personal" para todo.
-- `(SELECT admin_es_personal())` para que Postgres la evalúe una vez por
-- consulta y no una vez por fila.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_notificacion_pedido_leida', 'almacen', 'asignacion_sucursal',
    'banners', 'caja', 'categorias', 'cierrecaja', 'clientes_proveedores',
    'detalle_venta', 'ecommerce_orden_items', 'etiquetas', 'impresoras',
    'kardex', 'marca', 'metodos_pago', 'modulos', 'movimientos_caja',
    'movimientos_piezas', 'movimientos_stock', 'multiprecios', 'permisos',
    'permisos_dafault', 'piezas_inventario', 'producto_etiquetas',
    'producto_imagenes', 'producto_variante_imagenes', 'producto_variantes',
    'productos', 'roles', 'serializacion_comprobantes', 'stock',
    'sucursales', 'tipo_comprobantes', 'tipodocumento', 'usuarios', 'ventas'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format(
      'CREATE POLICY personal_todo ON public.%I FOR ALL TO authenticated '
      'USING ((SELECT admin_es_personal())) '
      'WITH CHECK ((SELECT admin_es_personal()))', t);
  END LOOP;
END $$;

-- Las policies viejas "cualquier logueado" (incluye clientes del ecommerce).
DROP POLICY "Enable delete for users based on user_id" ON public.categorias;
DROP POLICY "Enable update for users based on email"   ON public.categorias;
DROP POLICY "Enable read access for all users"         ON public.categorias;
DROP POLICY "Enable insert for authenticated users only" ON public.categorias;
DROP POLICY mp_select ON public.movimientos_piezas;
DROP POLICY mp_insert ON public.movimientos_piezas;
DROP POLICY pi_insert ON public.piezas_inventario;
DROP POLICY pi_select ON public.piezas_inventario;
DROP POLICY pi_update ON public.piezas_inventario;
DROP POLICY pv_update ON public.producto_variantes;
DROP POLICY pv_select ON public.producto_variantes;
DROP POLICY pv_insert ON public.producto_variantes;
DROP POLICY pv_delete ON public.producto_variantes;


-- ----------------------------------------------------------------------------
-- empresa: el personal la ve y la edita, pero nadie la crea ni la borra desde
-- la app. Antes, cualquier cuenta que entraba al admin sin fila en `usuarios`
-- creaba una empresa y el trigger insertpordefecto la hacía superadmin. Las
-- empresas nuevas las da de alta solo el dueño de la plataforma.
-- ----------------------------------------------------------------------------
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.empresa FROM anon;
CREATE POLICY personal_ver ON public.empresa FOR SELECT TO authenticated
  USING ((SELECT admin_es_personal()));
CREATE POLICY personal_editar ON public.empresa FOR UPDATE TO authenticated
  USING ((SELECT admin_es_personal()))
  WITH CHECK ((SELECT admin_es_personal()));


-- ----------------------------------------------------------------------------
-- TRUNCATE (y REFERENCES/TRIGGER) no respetan RLS: fuera para anon y
-- authenticated en todo `public`. Secuencias: anon no inserta nada.
-- ----------------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;


-- ----------------------------------------------------------------------------
-- Funciones: anon solo ejecuta las ecommerce_*. El resto (RPC del POS y del
-- admin) quedan para authenticated; como son SECURITY INVOKER, RLS ya frena
-- a un cliente del ecommerce que las llame.
-- El EXECUTE de anon viene por PUBLIC, por eso se revoca de PUBLIC y se le
-- devuelve explícito a authenticated y service_role.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND p.proname NOT LIKE 'ecommerce\_%'
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- Las RPC SECURITY DEFINER del admin no pasan por RLS: chequean personal
-- adentro. Mismo cuerpo que antes + el chequeo (las de lectura, en el WHERE:
-- a quien no es personal no le devuelven nada; las que escriben, error).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_exigir_personal()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT admin_es_personal() THEN
    RAISE EXCEPTION 'Solo el personal del admin puede hacer esto'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_exigir_personal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_exigir_personal() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_listar_pedidos_ecommerce()
RETURNS TABLE (
  id bigint, fecha timestamptz, monto_total numeric, nro_comprobante text,
  metodo_pago text, estado_envio text,
  destinatario text, telefono text, email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT v.id, v.fecha::timestamptz, v.monto_total, v.nro_comprobante,
         v.metodo_pago, v.estado_envio, e.destinatario, e.telefono, e.email
  FROM public.ventas v
  LEFT JOIN public.ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
  WHERE v.origen = 'ecommerce' AND v.estado = 'confirmada'
    AND admin_es_personal()
  ORDER BY v.fecha DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_actualizar_estado_envio(_id_venta bigint, _estado_envio text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM admin_exigir_personal();
  IF _estado_envio NOT IN ('preparando', 'enviado', 'entregado') THEN
    RAISE EXCEPTION 'estado de envío inválido: %', _estado_envio;
  END IF;
  UPDATE public.ventas SET estado_envio = _estado_envio
  WHERE id = _id_venta AND origen = 'ecommerce' AND estado = 'confirmada';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no se encontró un pedido ecommerce confirmado con ese id';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_detalle_pedido_ecommerce(_id_venta bigint)
RETURNS TABLE (
  destinatario    text,
  telefono        text,
  email           text,
  cp              text,
  estado          text,
  municipio       text,
  colonia         text,
  calle           text,
  numero_exterior text,
  numero_interior text,
  entre_calles    text,
  referencias     text,
  items           jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.destinatario, e.telefono, e.email,
    e.cp, e.estado, e.municipio, e.colonia, e.calle,
    e.numero_exterior, e.numero_interior, e.entre_calles, e.referencias,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nombre', COALESCE(p.nombre, d.descripcion, 'Producto'),
        'cantidad', d.cantidad,
        'total', d.total
      ))
      FROM public.detalle_venta d
      LEFT JOIN public.productos p ON p.id = d.id_producto
      WHERE d.id_venta = v.id
    ), '[]'::jsonb) AS items
  FROM public.ventas v
  LEFT JOIN public.ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
  WHERE v.id = _id_venta AND v.origen = 'ecommerce'
    AND admin_es_personal();
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_notificaciones_pedidos()
RETURNS TABLE (
  id bigint,
  fecha timestamptz,
  nro_comprobante text,
  monto_total numeric,
  destinatario text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT v.id, v.fecha::timestamptz, v.nro_comprobante, v.monto_total, e.destinatario
  FROM public.ventas v
  LEFT JOIN public.ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
  WHERE v.origen = 'ecommerce' AND v.estado = 'confirmada'
    AND admin_es_personal()
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_notificacion_pedido_leida n
      WHERE n.id_venta = v.id
        AND n.id_usuario = (SELECT id FROM public.usuarios WHERE id_auth = auth.uid()::text)
    )
  ORDER BY v.fecha DESC
  LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION public.admin_marcar_notificacion_leida(_id_venta bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id_usuario bigint;
BEGIN
  PERFORM admin_exigir_personal();
  SELECT id INTO v_id_usuario FROM public.usuarios WHERE id_auth = auth.uid()::text;
  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'usuario no encontrado';
  END IF;

  INSERT INTO public.admin_notificacion_pedido_leida (id_usuario, id_venta)
  VALUES (v_id_usuario, _id_venta)
  ON CONFLICT (id_usuario, id_venta) DO NOTHING;
END;
$$;

-- crearcredencialesuser crea cuentas ya confirmadas en auth.users con el
-- correo y la clave que le pasen; la usa la pantalla Usuarios del admin.
-- Antes la podía llamar cualquiera con la anon key.
CREATE OR REPLACE FUNCTION public.crearcredencialesuser(email text, pass text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
   user_id uuid;
begin
   perform public.admin_exigir_personal();
   user_id := gen_random_uuid();
   insert into auth.users (
      id,
      email,
      encrypted_password,
      raw_app_meta_data,
      created_at,
      updated_at, -- Incluye el campo updated_at
      instance_id,
      aud,
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      phone_change,
      email_confirmed_at
   )
   values (
      user_id,
      email,
      crypt(pass, gen_salt('bf')),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      now(),
      now(), -- Asigna la hora actual a updated_at
      (SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1),
      'authenticated',
      'authenticated',
      '', -- confirmation_token
      '', -- email_change
      '', -- email_change_token_new
      '', -- recovery_token
      '', -- phone_change
      now()
   );
   return user_id;
end;
$function$;

-- CREATE OR REPLACE conserva los grants, pero por las dudas:
REVOKE ALL ON FUNCTION public.admin_listar_pedidos_ecommerce() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_estado_envio(bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_detalle_pedido_ecommerce(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_listar_notificaciones_pedidos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_marcar_notificacion_leida(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crearcredencialesuser(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_pedidos_ecommerce() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_estado_envio(bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_detalle_pedido_ecommerce(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_listar_notificaciones_pedidos() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_marcar_notificacion_leida(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crearcredencialesuser(text, text) TO authenticated, service_role;
