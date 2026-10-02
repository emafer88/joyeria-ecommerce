-- ============================================================================
-- Mercado Libre, Fase 6: panel en el admin (página /mercadolibre).
-- ============================================================================
-- Las tablas ml_* son solo service_role (tokens, estado interno). El admin
-- las lee y escribe a través de estas RPC ml_admin_*, SECURITY DEFINER.
--
-- OJO: `authenticated` NO es solo el personal. Los clientes del ecommerce
-- también inician sesión en el mismo Supabase Auth (ver
-- 20260908130000_ecommerce_auth_clientes.sql: van a clientes_proveedores,
-- nunca a usuarios). Por eso cada RPC exige admin_es_personal(): una fila
-- ACTIVA en usuarios con el id_auth del que llama. Qué rol ve la página lo
-- decide el admin con los permisos de módulos, como el resto del menú.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
     WHERE id_auth = auth.uid()::text
       AND estado = 'ACTIVO'
  );
$$;
REVOKE ALL ON FUNCTION public.admin_es_personal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_es_personal() TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.ml_admin_exigir_personal()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT admin_es_personal() THEN
    RAISE EXCEPTION 'Solo el personal del admin puede ver Mercado Libre'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_admin_exigir_personal() FROM PUBLIC, anon;


-- ----------------------------------------------------------------------------
-- Cuenta conectada: para mostrar si el token está vigente (lo renueva el
-- cron de ml-sincronizar; si vence, algo anda mal con el cron).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_admin_cuenta()
RETURNS TABLE (ml_user_id bigint, expira_en timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY SELECT c.ml_user_id, c.expira_en FROM ml_cuenta c WHERE c.id = 1;
END;
$$;


-- ----------------------------------------------------------------------------
-- Diseños configurados, con cuántas piezas hay disponibles y cómo están sus
-- publicaciones.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_admin_listar_disenos()
RETURNS TABLE (
  id_producto bigint, nombre text, publicar boolean, ml_category_id text,
  atributos jsonb, piezas_disponibles bigint, publicaciones_activas bigint,
  publicaciones_con_error bigint, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT c.id_producto::bigint, p.nombre, c.publicar, c.ml_category_id, c.atributos,
         (SELECT count(*) FROM piezas_inventario pi
           WHERE pi.id_producto = c.id_producto AND pi.estado = 'disponible'),
         (SELECT count(*) FROM ml_publicaciones mp
           WHERE mp.id_producto = c.id_producto AND mp.estado_ml = 'active'),
         (SELECT count(*) FROM ml_publicaciones mp
           WHERE mp.id_producto = c.id_producto AND mp.ultimo_error IS NOT NULL),
         c.updated_at
    FROM ml_config_producto c
    JOIN productos p ON p.id = c.id_producto
   ORDER BY p.nombre;
END;
$$;


-- Diseños de joyería que todavía no están configurados (para el formulario).
CREATE OR REPLACE FUNCTION public.ml_admin_disenos_sin_configurar()
RETURNS TABLE (id_producto bigint, nombre text, piezas_disponibles bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT p.id, p.nombre,
         (SELECT count(*) FROM piezas_inventario pi
           WHERE pi.id_producto = p.id AND pi.estado = 'disponible')
    FROM productos p
   WHERE p.es_joyeria
     AND NOT EXISTS (SELECT 1 FROM ml_config_producto c WHERE c.id_producto = p.id)
   ORDER BY p.nombre;
END;
$$;


-- ----------------------------------------------------------------------------
-- Alta / edición / activar-pausar. El trigger ml_sincronizar_config dispara
-- la sincronización de ese diseño al guardar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_admin_guardar_diseno(
  _id_producto    integer,
  _publicar       boolean,
  _ml_category_id text,
  _atributos      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();

  IF coalesce(trim(_ml_category_id), '') !~ '^MLM\d+$' THEN
    RAISE EXCEPTION 'Categoría de Mercado Libre inválida: %', _ml_category_id;
  END IF;
  IF jsonb_typeof(_atributos) <> 'array' THEN
    RAISE EXCEPTION 'Los atributos deben ser una lista';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_atributos) a
              WHERE coalesce(trim(a->>'id'), '') = ''
                 OR coalesce(trim(a->>'value_name'), '') = '') THEN
    RAISE EXCEPTION 'Todos los atributos necesitan un valor';
  END IF;

  INSERT INTO ml_config_producto (id_producto, publicar, ml_category_id, atributos, updated_at)
  VALUES (_id_producto, _publicar, trim(_ml_category_id), _atributos, now())
  ON CONFLICT (id_producto) DO UPDATE
     SET publicar       = EXCLUDED.publicar,
         ml_category_id = EXCLUDED.ml_category_id,
         atributos      = EXCLUDED.atributos,
         updated_at     = now();
END;
$$;


CREATE OR REPLACE FUNCTION public.ml_admin_listar_publicaciones()
RETURNS TABLE (
  id integer, id_producto bigint, nombre text, modelo text, ml_item_id text,
  estado_ml text, cantidad_publicada integer, precio_publicado numeric,
  ultimo_error text, sincronizado_en timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT mp.id, mp.id_producto::bigint, p.nombre, mp.modelo, mp.ml_item_id,
         mp.estado_ml, mp.cantidad_publicada, mp.precio_publicado,
         mp.ultimo_error, mp.sincronizado_en
    FROM ml_publicaciones mp
    JOIN productos p ON p.id = mp.id_producto
   ORDER BY (mp.ultimo_error IS NULL), p.nombre, mp.modelo;
END;
$$;


CREATE OR REPLACE FUNCTION public.ml_admin_listar_ordenes()
RETURNS TABLE (
  ml_order_id bigint, estado_ml text, comprador text, total numeric,
  ultimo_error text, created_at timestamptz, updated_at timestamptz,
  id_venta bigint, nro_comprobante text, estado_venta text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  RETURN QUERY
  SELECT o.ml_order_id, o.estado_ml, o.comprador, o.total, o.ultimo_error,
         o.created_at, o.updated_at, o.id_venta, v.nro_comprobante, v.estado
    FROM ml_ordenes o
    LEFT JOIN ventas v ON v.id = o.id_venta
   ORDER BY (o.ultimo_error IS NULL), o.created_at DESC
   LIMIT 200;
END;
$$;


-- "Sincronizar ahora": body {} = todos los diseños, sin refrescar el token
-- (eso queda solo para el cron, ver ml-sincronizar).
CREATE OR REPLACE FUNCTION public.ml_admin_sincronizar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ml_admin_exigir_personal();
  PERFORM ml_pedir_sincronizacion('{}'::jsonb);
END;
$$;


REVOKE ALL ON FUNCTION public.ml_admin_cuenta() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_listar_disenos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_disenos_sin_configurar() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_guardar_diseno(integer, boolean, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_listar_publicaciones() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_listar_ordenes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_admin_sincronizar() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ml_admin_cuenta() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_listar_disenos() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_disenos_sin_configurar() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_guardar_diseno(integer, boolean, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_listar_publicaciones() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_listar_ordenes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_admin_sincronizar() TO authenticated, service_role;
