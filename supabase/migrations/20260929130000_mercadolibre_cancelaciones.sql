-- ============================================================================
-- Mercado Libre, Fase 5: anular la venta cuando la orden se cancela en ML.
-- ============================================================================
-- ml-webhook (repo joyeria-mercadolibre) llama a ml_anular_orden cuando una
-- orden con venta confirmada pasa a cancelled/invalid en ML, y SOLO si el
-- envío todavía no salió: si la pieza ya está en camino no está en la tienda,
-- y devolverla a 'disponible' la republicaría en ML (se podría vender sin
-- tenerla). Ese caso queda en ml_ordenes.ultimo_error para resolver a mano
-- con devolver_pieza cuando la pieza vuelva.
--
-- No se borran las líneas de detalle_venta (queda el registro de lo que se
-- vendió): las piezas vuelven con devolver_pieza (movimiento 'devolucion') y
-- la venta pasa a 'anulada', el mismo estado que usa el ecommerce. El
-- trigger ml_sincronizar_pieza_upd devuelve el stock a la publicación.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ml_anular_orden(
  _ml_order_id bigint,
  _id_empresa  integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orden text := _ml_order_id::text;
  v_venta record;
  v_pieza record;
  v_nota  text := 'orden de Mercado Libre ' || _ml_order_id || ' cancelada';
BEGIN
  -- Mismo lock que ml_confirmar_orden: una cancelación no se cruza con la
  -- confirmación de la misma orden.
  PERFORM pg_advisory_xact_lock(hashtext('ml_orden'), hashtext(v_orden));

  SELECT id, estado INTO v_venta FROM ventas
   WHERE origen = 'mercadolibre' AND id_orden_externa = v_orden
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'sin venta';
  END IF;
  IF v_venta.estado = 'anulada' THEN
    RETURN 'ya anulada';
  END IF;

  FOR v_pieza IN
    SELECT pi.id, pi.estado
      FROM detalle_venta dv
      JOIN piezas_inventario pi ON pi.id = dv.id_pieza
     WHERE dv.id_venta = v_venta.id
     FOR UPDATE OF pi
  LOOP
    -- devolver_pieza/liberar_pieza reciben integer; los ids son bigint.
    IF v_pieza.estado = 'vendida' THEN
      PERFORM devolver_pieza(v_pieza.id::integer, _id_empresa, NULL, 'disponible', v_nota);
    ELSIF v_pieza.estado = 'reservada' THEN
      PERFORM liberar_pieza(v_pieza.id::integer, _id_empresa, NULL);
    END IF;
    -- Otro estado (perdida, dañada...): alguien ya la movió a mano, no se toca.
  END LOOP;

  UPDATE ventas SET estado = 'anulada' WHERE id = v_venta.id;
  RETURN 'anulada';
END;
$$;
REVOKE ALL ON FUNCTION public.ml_anular_orden(bigint, integer) FROM PUBLIC, anon, authenticated;
