-- ============================================================================
-- Ecommerce: identidad del comprador (Supabase Auth) <-> cliente del POS.
-- ============================================================================
-- Los compradores del ecommerce son filas de `auth.users` (login con Google,
-- por ahora). El POS referencia clientes por `ventas.id_cliente ->
-- clientes_proveedores.id` (entero). Esta migración tiende el puente:
--
--   ecommerce_cliente_perfil : mapea auth.users.id (uuid) -> clientes_proveedores.id
--   ecommerce_vincular_cliente(...) : upsert idempotente de ese mapeo, server-side
--   ecommerce_mis_pedidos() : historial de pedidos del usuario autenticado
--
-- Decisiones:
--  - No se toca el shape de `clientes_proveedores` (tabla compartida con el
--    POS). El mapeo uuid<->int y los datos propios del ecommerce viven en la
--    tabla nueva.
--  - Se CREA una fila en `clientes_proveedores` por comprador para que el POS
--    lo vea en su CRM y para satisfacer el FK de `ventas.id_cliente`.
--    `tipo = 'cliente'` (ajustar si el POS filtra por otra convención).
--  - El vínculo se hace en el checkout (crear-preferencia-pago), con el
--    usuario ya resuelto desde el JWT; por eso vincular_cliente toma
--    _user_id explícito y solo la puede ejecutar service_role.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Tabla de mapeo + perfil de ecommerce.
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecommerce_cliente_perfil (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  id_empresa integer     NOT NULL,
  id_cliente bigint      NOT NULL REFERENCES public.clientes_proveedores (id),
  email      text,
  nombre     text,
  telefono   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ecommerce_cliente_perfil_id_cliente_key
  ON public.ecommerce_cliente_perfil (id_cliente);

ALTER TABLE public.ecommerce_cliente_perfil ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve su propia fila. No hay policy de INSERT/UPDATE/DELETE
-- para `authenticated`: la escritura pasa siempre por vincular_cliente
-- (SECURITY DEFINER, service_role).
CREATE POLICY "perfil propio - select"
  ON public.ecommerce_cliente_perfil
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

REVOKE ALL ON public.ecommerce_cliente_perfil FROM PUBLIC, anon;
GRANT SELECT ON public.ecommerce_cliente_perfil TO authenticated;
GRANT ALL ON public.ecommerce_cliente_perfil TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 2) ecommerce_vincular_cliente: upsert idempotente uuid -> id_cliente.
--    La llama crear-preferencia-pago (service_role) con el usuario ya
--    resuelto del JWT. Devuelve el id_cliente para clavarlo en la venta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_vincular_cliente(
  _user_id  uuid,
  _email    text DEFAULT NULL,
  _nombre   text DEFAULT NULL,
  _telefono text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id_cliente bigint;
  v_nombre     text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'ecommerce_vincular_cliente requiere _user_id';
  END IF;

  SELECT id_cliente INTO v_id_cliente
  FROM public.ecommerce_cliente_perfil
  WHERE user_id = _user_id;

  IF FOUND THEN
    RETURN v_id_cliente;
  END IF;

  v_nombre := COALESCE(
    NULLIF(btrim(_nombre), ''),
    NULLIF(split_part(COALESCE(_email, ''), '@', 1), ''),
    'Cliente web'
  );

  INSERT INTO public.clientes_proveedores
    (id_empresa, nombres, email, telefono, tipo, fecha_registro)
  VALUES
    (public.ecommerce_id_empresa(), v_nombre, _email, _telefono, 'cliente', now())
  RETURNING id INTO v_id_cliente;

  INSERT INTO public.ecommerce_cliente_perfil
    (user_id, id_empresa, id_cliente, email, nombre, telefono)
  VALUES
    (_user_id, public.ecommerce_id_empresa(), v_id_cliente, _email, v_nombre, _telefono);

  RETURN v_id_cliente;
END;
$$;

REVOKE ALL ON FUNCTION public.ecommerce_vincular_cliente(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ecommerce_vincular_cliente(uuid, text, text, text)
  TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 3) ecommerce_mis_pedidos: historial del usuario autenticado. Usa auth.uid()
--    (se llama con la sesión del usuario, nunca con service_role). El detalle
--    de cada pedido sigue saliendo de la Edge Function estado-pedido.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_mis_pedidos()
RETURNS TABLE (
  id_orden_externa   text,
  fecha              timestamptz,
  estado             text,
  monto_total        numeric,
  nro_comprobante    text,
  cantidad_productos integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    v.id_orden_externa,
    v.fecha::timestamptz AS fecha,
    v.estado,
    v.monto_total,
    v.nro_comprobante,
    v.cantidad_productos
  FROM public.ventas v
  JOIN public.ecommerce_cliente_perfil p ON p.id_cliente = v.id_cliente
  WHERE p.user_id = auth.uid()
    AND v.origen = 'ecommerce'
    AND v.id_orden_externa IS NOT NULL
  ORDER BY v.fecha DESC;
$$;

REVOKE ALL ON FUNCTION public.ecommerce_mis_pedidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ecommerce_mis_pedidos() TO authenticated, service_role;
