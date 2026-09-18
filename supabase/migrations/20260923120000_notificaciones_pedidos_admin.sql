-- ============================================================================
-- Notificaciones de pedidos nuevos para el panel admin (proyecto-joyeria),
-- en tiempo real vía Supabase Realtime sobre `ventas`. Leído/no leído se
-- guarda por usuario staff (usuarios.id, resuelto de auth.uid() vía
-- usuarios.id_auth), no de forma global.
-- ============================================================================

-- Habilita Realtime sobre ventas (movimientos_caja ya lo tenía, agregado a
-- mano en su momento — esta vez va en migración para que quede reproducible).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ventas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas;
  END IF;
END $$;

CREATE TABLE public.admin_notificacion_pedido_leida (
  id_usuario bigint NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  id_venta   bigint NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  leida_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_usuario, id_venta)
);

GRANT SELECT, INSERT ON public.admin_notificacion_pedido_leida TO authenticated;
GRANT ALL ON public.admin_notificacion_pedido_leida TO postgres, service_role;

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
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_notificacion_pedido_leida n
      WHERE n.id_venta = v.id
        AND n.id_usuario = (SELECT id FROM public.usuarios WHERE id_auth = auth.uid()::text)
    )
  ORDER BY v.fecha DESC
  LIMIT 30;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_notificaciones_pedidos() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_marcar_notificacion_leida(_id_venta bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id_usuario bigint;
BEGIN
  SELECT id INTO v_id_usuario FROM public.usuarios WHERE id_auth = auth.uid()::text;
  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'usuario no encontrado';
  END IF;

  INSERT INTO public.admin_notificacion_pedido_leida (id_usuario, id_venta)
  VALUES (v_id_usuario, _id_venta)
  ON CONFLICT (id_usuario, id_venta) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_marcar_notificacion_leida(bigint) TO authenticated;
