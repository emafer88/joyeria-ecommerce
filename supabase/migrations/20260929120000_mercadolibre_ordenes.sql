-- ============================================================================
-- Mercado Libre, Fase 3: registrar como venta cada orden pagada en ML.
-- ============================================================================
-- La Edge Function ml-webhook (repo joyeria-mercadolibre) recibe la
-- notificación orders_v2, reconsulta la orden en la API de ML (nunca confía
-- en el body) y, si está pagada, llama a ml_confirmar_orden.
--
-- Una publicación de ML es un GRUPO de piezas idénticas (ver
-- 20260924130000_mercadolibre_grupos.sql): la venta se lleva cualquier pieza
-- disponible del grupo. Todo pasa en UNA transacción (venta + reserva +
-- confirmación): si falta una pieza se revierte entero y no queda ninguna
-- venta 'pendiente' colgada (por eso no hace falta ecommerce_orden_items ni
-- liberar-reservas-vencidas para este canal).
--
-- Red de seguridad: ML no reintenta si ml-webhook ya respondió 200 y el
-- proceso falló después, así que un cron reconsulta cada 15 min las órdenes
-- pagadas recientes que todavía no tienen venta.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Serie de comprobantes propia del canal: ML-00000001, ...
-- ----------------------------------------------------------------------------
INSERT INTO public.serializacion_comprobantes
    (id_tipo_comprobante, serie, cantidad_numeros, correlativo, sucursal_id, por_default)
SELECT 2, 'ML', 8, 0, 1, false
-- En una base nueva todavía no hay sucursal 1: la serie la crea el instalador.
WHERE EXISTS (SELECT 1 FROM public.sucursales WHERE id = 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.serializacion_comprobantes
     WHERE id_tipo_comprobante = 2 AND serie = 'ML' AND sucursal_id = 1
);


-- ----------------------------------------------------------------------------
-- 2) Bitácora de órdenes de ML: una fila por orden que llegó (pagada o no).
--    La Fase 5 (cancelaciones) y el panel del admin (Fase 6) leen de acá.
--    Solo service_role.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_ordenes (
  ml_order_id  bigint      PRIMARY KEY,
  estado_ml    text        NOT NULL,
  id_venta     bigint      REFERENCES public.ventas(id),
  comprador    text,
  total        numeric(12,2),
  ultimo_error text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_ordenes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_ordenes FROM anon, authenticated;

COMMENT ON COLUMN public.ml_ordenes.estado_ml IS
  'Último status de la orden en ML: confirmed | payment_required | payment_in_process | paid | cancelled | invalid...';
COMMENT ON COLUMN public.ml_ordenes.ultimo_error IS
  'Por qué no se pudo registrar la venta (p. ej. sin piezas disponibles: se vendió en otro canal antes de que ML bajara el stock). Requiere revisión manual.';


-- ----------------------------------------------------------------------------
-- 3) ml_confirmar_orden: crea y confirma la venta de una orden pagada.
--    _lineas = [{"ml_item_id": "MLM123", "cantidad": 1}, ...]
--    Idempotente: si la orden ya tiene venta, la devuelve sin tocar nada.
--    Devuelve el id de la venta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ml_confirmar_orden(
  _ml_order_id         bigint,
  _lineas              jsonb,
  _monto_total         numeric,
  _metodo_pago         text,
  _id_empresa          integer,
  _id_sucursal         integer,
  _id_tipo_comprobante integer,
  _serie               text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canal    constant text := 'mercadolibre';
  v_orden    text := _ml_order_id::text;
  v_id_venta bigint;
  v_linea    record;
  v_pub      record;
  v_pieza    record;
  v_tomadas  integer;
BEGIN
  -- ML manda varias notificaciones por orden y el cron también puede
  -- procesarla: la segunda espera acá y después ve la venta ya creada.
  PERFORM pg_advisory_xact_lock(hashtext('ml_orden'), hashtext(v_orden));

  SELECT id INTO v_id_venta FROM ventas
   WHERE origen = v_canal AND id_orden_externa = v_orden;
  IF FOUND THEN
    RETURN v_id_venta;
  END IF;

  INSERT INTO ventas (
    fecha, id_sucursal, id_empresa, id_cliente, monto_total, sub_total,
    total_impuestos, valor_impuesto, referencia_tarjeta, cantidad_productos,
    estado, nro_comprobante, origen, id_orden_externa, metodo_pago
  ) VALUES (
    now(), _id_sucursal, _id_empresa, NULL, _monto_total, _monto_total,
    0, 0, '-', jsonb_array_length(_lineas),
    'pendiente', NULL, v_canal, v_orden, _metodo_pago
  )
  RETURNING id INTO v_id_venta;

  FOR v_linea IN
    SELECT * FROM jsonb_to_recordset(_lineas) AS x(ml_item_id text, cantidad integer)
  LOOP
    SELECT id_producto,
           split_part(clave_grupo, '|', 1)::integer AS id_variante,
           split_part(clave_grupo, '|', 2)::numeric AS peso,
           split_part(clave_grupo, '|', 3)          AS talla,
           split_part(clave_grupo, '|', 4)::numeric AS precio
      INTO v_pub
      FROM ml_publicaciones
     WHERE ml_item_id = v_linea.ml_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La publicación % no está en ml_publicaciones', v_linea.ml_item_id;
    END IF;

    -- Piezas del grupo. Primero las del precio publicado; si no alcanzan,
    -- cualquiera del mismo diseño/variante/peso/talla (el precio pudo cambiar
    -- entre la venta en ML y la próxima sincronización). SKIP LOCKED: dos
    -- órdenes simultáneas del mismo grupo nunca se llevan la misma pieza.
    v_tomadas := 0;
    FOR v_pieza IN
      SELECT id FROM piezas_inventario
       WHERE id_producto = v_pub.id_producto
         AND id_empresa  = _id_empresa
         AND estado      = 'disponible'
         AND id_variante = v_pub.id_variante
         AND peso        = v_pub.peso
         AND coalesce(talla, '') = v_pub.talla
       ORDER BY (coalesce(precio_oferta, precio_venta) = v_pub.precio) DESC, id
       LIMIT v_linea.cantidad
       FOR UPDATE SKIP LOCKED
    LOOP
      -- reservar_pieza recibe integer; los ids de estas tablas son bigint.
      PERFORM reservar_pieza(v_pieza.id::integer, v_id_venta::integer, _id_empresa, NULL);
      v_tomadas := v_tomadas + 1;
    END LOOP;

    IF v_tomadas < v_linea.cantidad THEN
      RAISE EXCEPTION 'Sin piezas disponibles para % (pedidas %, disponibles %)',
        v_linea.ml_item_id, v_linea.cantidad, v_tomadas;
    END IF;
  END LOOP;

  -- Inserta detalle_venta por pieza reservada, genera el comprobante y pasa
  -- las piezas a 'vendida' (triggers existentes de joyería).
  PERFORM crear_venta_externa_piezas(v_canal, v_orden, _id_tipo_comprobante, _serie);

  RETURN v_id_venta;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_confirmar_orden(bigint, jsonb, numeric, text, integer, integer, integer, text)
  FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4) Cron de reconciliación de órdenes (misma idea que ml-sincronizar: si ML
--    no respondiera, se degrada a WARNING y el próximo cron reintenta).
-- ----------------------------------------------------------------------------
SELECT cron.unschedule('ml-reconciliar-ordenes')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ml-reconciliar-ordenes');

SELECT cron.schedule(
    'ml-reconciliar-ordenes',
    '7,22,37,52 * * * *',
    $$ SELECT net.http_post(
         url     := 'https://yuyjoupristotpnnblva.supabase.co/functions/v1/ml-webhook',
         headers := '{"Content-Type": "application/json"}'::jsonb,
         body    := '{"reconciliar": true}'::jsonb
       ); $$
);
