-- ============================================================================
-- Pipeline de estados de envío (Pago recibido → Preparando → Enviado →
-- Entregado) + método de pago real, para que el comprador consulte sus
-- pedidos y el admin (proyecto-joyeria) los pueda avanzar.
--   - estado_envio vive SEPARADO de ventas.estado (que sigue siendo solo el
--     ciclo de vida del pago/POS: pendiente/confirmada/anulada). NULL +
--     estado='confirmada' = "Pago recibido" (primer escalón); nadie lo pone
--     en 'preparando' automáticamente, lo avanza el admin a mano.
-- ============================================================================

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS estado_envio text NULL,
  ADD COLUMN IF NOT EXISTS metodo_pago  text NULL;

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_estado_envio_chk
  CHECK (estado_envio IS NULL OR estado_envio IN ('preparando', 'enviado', 'entregado'));


-- ----------------------------------------------------------------------------
-- RPC de admin (proyecto-joyeria), prefijo admin_ a propósito: NO son
-- ecommerce_* (esas están reservadas para lo que puede llamar `anon`). Estas
-- solo se otorgan a `authenticated`/`service_role`. Hacen falta porque
-- ecommerce_orden_envio tiene RLS user_id = auth.uid() — el staff del admin
-- no es el comprador, un select() directo no devolvería filas.
-- ----------------------------------------------------------------------------
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
  ORDER BY v.fecha DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_pedidos_ecommerce() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_actualizar_estado_envio(_id_venta bigint, _estado_envio text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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

GRANT EXECUTE ON FUNCTION public.admin_actualizar_estado_envio(bigint, text) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- ecommerce_mis_pedidos: agrega estado_envio. Cambia el RETURNS TABLE ->
-- hace falta DROP antes del CREATE OR REPLACE (mismo patrón ya usado en el
-- resto de las migraciones de este proyecto).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_mis_pedidos();

CREATE OR REPLACE FUNCTION public.ecommerce_mis_pedidos()
RETURNS TABLE (
  id_orden_externa   text,
  fecha              timestamptz,
  estado             text,
  monto_total        numeric,
  nro_comprobante    text,
  cantidad_productos integer,
  estado_envio       text
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
    v.cantidad_productos,
    v.estado_envio
  FROM public.ventas v
  JOIN public.ecommerce_cliente_perfil p ON p.id_cliente = v.id_cliente
  WHERE p.user_id = auth.uid()
    AND v.origen = 'ecommerce'
    AND v.id_orden_externa IS NOT NULL
  ORDER BY v.fecha DESC;
$$;

REVOKE ALL ON FUNCTION public.ecommerce_mis_pedidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ecommerce_mis_pedidos() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Tarjeta nueva en Configuraciones/menú (panel admin) + permiso para los
-- mismos usuarios que ya tienen acceso a Dashboard/Reportes (ids 1 y 4,
-- confirmado contra la base real). etiquetas = '#operacion': es una tarea
-- operativa diaria, no una config, va junto a Dashboard/Reportes en el menú.
-- ----------------------------------------------------------------------------
INSERT INTO public.modulos (nombre, descripcion, icono, link, etiquetas)
SELECT 'Pedidos', 'gestiona los pedidos del ecommerce',
       'https://i.ibb.co/85zJ6yG/caja-del-paquete.png',
       '/pedidos', '#operacion'
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE link = '/pedidos');

INSERT INTO public.permisos (id_usuario, idmodulo)
SELECT u.id_usuario, m.id
FROM (VALUES (1), (4)) AS u(id_usuario)
CROSS JOIN public.modulos m
WHERE m.link = '/pedidos'
  AND NOT EXISTS (
    SELECT 1 FROM public.permisos p
    WHERE p.id_usuario = u.id_usuario AND p.idmodulo = m.id
  );
