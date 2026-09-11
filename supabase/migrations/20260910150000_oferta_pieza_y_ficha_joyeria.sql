-- ============================================================================
-- Joyería: oferta por pieza + ficha técnica del diseño (medidas/tallas).
-- ============================================================================
-- Un diseño de joyería no tiene un precio_venta fijo (el precio real vive en
-- la pieza física, según peso/material del día) -> "oferta del diseño" no se
-- correspondía con nada concreto. Acá se agrega el descuento donde sí importa:
-- la PIEZA. Toca 3 capas que hay que mantener consistentes:
--   1) piezas_inventario.precio_oferta (dato).
--   2) ajustar_pieza / crear_piezas_masivo (alta desde el panel).
--   3) crear_venta_externa_piezas (finaliza la venta real -> ver
--      supabase/functions/crear-preferencia-pago, que también se actualiza en
--      este PR para reservar/cobrar el precio efectivo).
-- Todo lo demás de crear_venta_externa_piezas queda IDÉNTICO a
-- 20260903210000_ecommerce_venta_piezas.sql, solo cambia qué precio usa.
-- ============================================================================

ALTER TABLE public.piezas_inventario
  ADD COLUMN IF NOT EXISTS precio_oferta numeric(12,2) NULL;

ALTER TABLE public.piezas_inventario
  ADD CONSTRAINT piezas_inventario_precio_oferta_chk
  CHECK (precio_oferta IS NULL OR precio_oferta >= 0);

COMMENT ON COLUMN public.piezas_inventario.precio_oferta IS
  'Precio con descuento de esta pieza puntual (NULL = sin oferta). Debe ser < precio_venta.';


-- ----------------------------------------------------------------------------
-- 1) ajustar_pieza: suma _talla, _precio_oferta y _quitar_oferta.
--    _quitar_oferta=true fuerza precio_oferta a NULL (coalesce no alcanza
--    para "borrar" un valor). Nuevo overload (mismo patrón que
--    insertarproductos + _destacado en 20260909180000): PostgREST resuelve
--    por nombre de parámetro, las llamadas viejas de 7 args no se rompen.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ajustar_pieza(
  _id_pieza integer,
  _id_empresa integer,
  _id_usuario integer,
  _peso numeric,
  _costo numeric,
  _precio_venta numeric,
  _nota text,
  _talla text DEFAULT NULL,
  _precio_oferta numeric DEFAULT NULL,
  _quitar_oferta boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_ant piezas_inventario;
  v_precio_final numeric;
BEGIN
  SELECT * INTO v_ant FROM piezas_inventario
   WHERE id = _id_pieza AND id_empresa = _id_empresa FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pieza % no encontrada', _id_pieza; END IF;
  IF v_ant.estado = 'vendida' THEN
    RAISE EXCEPTION 'No se puede ajustar una pieza vendida (id %)', _id_pieza;
  END IF;
  IF _peso IS NOT NULL AND _peso <= 0 THEN RAISE EXCEPTION 'peso debe ser > 0'; END IF;

  v_precio_final := coalesce(_precio_venta, v_ant.precio_venta);
  IF NOT _quitar_oferta AND _precio_oferta IS NOT NULL
     AND (_precio_oferta < 0 OR _precio_oferta >= v_precio_final) THEN
    RAISE EXCEPTION 'precio_oferta debe ser >= 0 y menor al precio de venta (%)', v_precio_final;
  END IF;

  UPDATE piezas_inventario
     SET peso          = coalesce(_peso, peso),
         costo         = coalesce(_costo, costo),
         precio_venta  = coalesce(_precio_venta, precio_venta),
         nota          = coalesce(_nota, nota),
         talla         = coalesce(_talla, talla),
         precio_oferta = CASE WHEN _quitar_oferta THEN NULL
                              ELSE coalesce(_precio_oferta, precio_oferta) END
   WHERE id = _id_pieza;

  INSERT INTO movimientos_piezas (id_pieza, id_empresa, tipo, estado_anterior, estado_nuevo, id_usuario, notas)
  VALUES (_id_pieza, _id_empresa, 'ajuste', v_ant.estado, v_ant.estado, _id_usuario,
          format('ajuste: peso %s->%s, costo %s->%s, precio %s->%s. %s',
                 v_ant.peso, coalesce(_peso, v_ant.peso),
                 v_ant.costo, coalesce(_costo, v_ant.costo),
                 v_ant.precio_venta, coalesce(_precio_venta, v_ant.precio_venta),
                 coalesce(_nota,'')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_pieza(integer, integer, integer, numeric, numeric, numeric, text, text, numeric, boolean)
  TO PUBLIC, anon, authenticated, postgres, service_role;


-- ----------------------------------------------------------------------------
-- 2) crear_piezas_masivo: cada línea puede traer "talla" (jsonb, opcional).
--    Mismo signature (_lineas es jsonb, no hace falta overload nuevo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_piezas_masivo(_id_variante integer, _id_empresa integer, _id_almacen integer, _id_usuario integer, _lineas jsonb)
 RETURNS SETOF piezas_inventario
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefijo    text;
  v_id_producto bigint;
  v_last       bigint;
  v_total      int := 0;
  v_counter    bigint;
  v_linea      jsonb;
  v_cant       int;
  v_peso       numeric;
  v_costo      numeric;
  v_precio     numeric;
  v_talla      text;
  i            int;
  v_id         bigint;
  v_sku        text;
  v_barcode    text;
  v_ids        bigint[] := '{}';
BEGIN
  IF _lineas IS NULL OR jsonb_typeof(_lineas) <> 'array' OR jsonb_array_length(_lineas) = 0 THEN
    RAISE EXCEPTION 'Se requiere al menos una línea de piezas';
  END IF;

  SELECT id_producto, sku_prefijo
    INTO v_id_producto, v_prefijo
    FROM producto_variantes
   WHERE id = _id_variante AND id_empresa = _id_empresa
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante % no encontrada para la empresa %', _id_variante, _id_empresa;
  END IF;
  IF v_prefijo IS NULL THEN
    RAISE EXCEPTION 'La variante % no tiene prefijo de SKU configurado', _id_variante;
  END IF;

  -- Validar líneas y contar el total de piezas a crear.
  FOR v_linea IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    v_cant   := coalesce((v_linea->>'cantidad')::int, 0);
    v_peso   := (v_linea->>'peso')::numeric;
    v_costo  := coalesce((v_linea->>'costo')::numeric, 0);
    v_precio := (v_linea->>'precio_venta')::numeric;
    IF v_cant < 1 THEN RAISE EXCEPTION 'cantidad debe ser >= 1 en cada línea'; END IF;
    IF v_peso IS NULL OR v_peso <= 0 THEN RAISE EXCEPTION 'peso debe ser > 0 en cada línea'; END IF;
    IF v_precio IS NULL OR v_precio < 0 THEN RAISE EXCEPTION 'precio_venta inválido en una línea'; END IF;
    IF v_costo < 0 THEN RAISE EXCEPTION 'costo inválido en una línea'; END IF;
    v_total := v_total + v_cant;
  END LOOP;

  -- Reservar el rango de correlativos de una sola vez (atómico bajo el lock).
  UPDATE producto_variantes
     SET ultimo_correlativo = ultimo_correlativo + v_total,
         updated_at = now()
   WHERE id = _id_variante
   RETURNING ultimo_correlativo INTO v_last;
  v_counter := v_last - v_total + 1;

  -- Crear cada pieza.
  FOR v_linea IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    v_cant   := (v_linea->>'cantidad')::int;
    v_peso   := (v_linea->>'peso')::numeric;
    v_costo  := coalesce((v_linea->>'costo')::numeric, 0);
    v_precio := (v_linea->>'precio_venta')::numeric;
    v_talla  := NULLIF(btrim(v_linea->>'talla'), '');

    FOR i IN 1..v_cant LOOP
      v_sku     := v_prefijo || '-' || lpad(v_counter::text, 4, '0');
      v_barcode := public.joyeria_ean13(_id_empresa, nextval('public.joyeria_barcode_seq'));

      INSERT INTO piezas_inventario (
        id_variante, id_producto, id_empresa, id_almacen,
        sku, barcode, peso, costo, precio_venta, talla, estado
      ) VALUES (
        _id_variante, v_id_producto, _id_empresa, _id_almacen,
        v_sku, v_barcode, v_peso, v_costo, v_precio, v_talla, 'disponible'
      )
      RETURNING id INTO v_id;

      INSERT INTO movimientos_piezas (
        id_pieza, id_empresa, tipo, estado_nuevo, id_usuario, notas
      ) VALUES (
        v_id, _id_empresa, 'entrada', 'disponible', _id_usuario, 'alta masiva'
      );

      v_ids := v_ids || v_id;
      v_counter := v_counter + 1;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT * FROM piezas_inventario WHERE id = ANY(v_ids) ORDER BY id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.crear_piezas_masivo(integer, integer, integer, integer, jsonb)
  TO PUBLIC, anon, authenticated, postgres, service_role;


-- ----------------------------------------------------------------------------
-- 3) crear_venta_externa_piezas: usa precio_oferta si está seteado. Es la
--    única función que reescribe (no puede quedar un overload viejo dando el
--    precio equivocado): mismo signature, mismos GRANT/REVOKE que
--    20260903210000_ecommerce_venta_piezas.sql, la única diferencia real es
--    `v_precio_pieza := COALESCE(v_pieza.precio_oferta, v_pieza.precio_venta)`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_venta_externa_piezas(_canal text, _id_orden_externa text, _id_tipo_comprobante integer, _serie text)
 RETURNS SETOF ventas
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_venta public.ventas%ROWTYPE;
    v_nro_comprobante text;
    v_pieza record;
    v_item record;
    v_precio_pieza numeric;
BEGIN
    IF _canal IS NULL OR _id_orden_externa IS NULL THEN
        RAISE EXCEPTION 'crear_venta_externa_piezas requiere _canal y _id_orden_externa';
    END IF;

    -- Lock de la fila: si dos webhooks (ej. reintento de Mercado Pago)
    -- llegan casi al mismo tiempo, el segundo espera a que el primero
    -- termine y después ve el estado ya actualizado (ver chequeo de abajo).
    SELECT * INTO v_venta FROM public.ventas
     WHERE origen = _canal AND id_orden_externa = _id_orden_externa
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una venta pendiente para % / % (crear-preferencia-pago debe crearla antes de confirmar)',
            _canal, _id_orden_externa;
    END IF;

    IF v_venta.estado = 'confirmada' THEN
        RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
        RETURN;
    END IF;

    -- Piezas de joyería ya reservadas para esta venta (reservar_pieza fue
    -- llamado desde crear-preferencia-pago). El trigger joyeria_detalle_venta_ai
    -- (AFTER INSERT existente) completa la reserva al ver id_pieza no nulo.
    FOR v_pieza IN
        SELECT id, id_producto, id_almacen, precio_venta, costo, precio_oferta
        FROM public.piezas_inventario
        WHERE id_venta_reserva = v_venta.id AND estado = 'reservada'
    LOOP
        v_precio_pieza := COALESCE(v_pieza.precio_oferta, v_pieza.precio_venta);
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, id_pieza, cantidad, precio_venta,
            precio_compra, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_pieza.id_producto, v_pieza.id, 1, v_precio_pieza,
            v_pieza.costo, v_precio_pieza, v_venta.id_sucursal, v_pieza.id_almacen
        );
    END LOOP;

    -- Productos por cantidad (no serializados): el trigger validarstock
    -- (AFTER... ya existente sobre detalle_venta) descuenta stock atómico.
    FOR v_item IN
        SELECT id_producto, id_almacen, cantidad, precio_venta, precio_compra, descripcion
        FROM public.ecommerce_orden_items
        WHERE origen = _canal AND id_orden_externa = _id_orden_externa
    LOOP
        INSERT INTO public.detalle_venta (
            id_venta, id_producto, cantidad, precio_venta,
            precio_compra, descripcion, total, id_sucursal, id_almacen
        ) VALUES (
            v_venta.id, v_item.id_producto, v_item.cantidad, v_item.precio_venta,
            v_item.precio_compra, v_item.descripcion,
            v_item.cantidad * v_item.precio_venta, v_venta.id_sucursal, v_item.id_almacen
        );
    END LOOP;

    -- El número de comprobante se genera recién acá (no al crear la
    -- preferencia): si el pago nunca se confirma, no se "quema" un número.
    SELECT public.generar_nro_comprobante(_id_tipo_comprobante, _serie, v_venta.id_sucursal::integer)
      INTO v_nro_comprobante;

    UPDATE public.ventas
       SET estado = 'confirmada', nro_comprobante = v_nro_comprobante
     WHERE id = v_venta.id;
    -- Dispara zzz_joyeria_ventas_confirmar_au (ya existente, AFTER UPDATE ON
    -- ventas): promueve a 'vendida' las piezas reservadas de esta venta.

    RETURN QUERY SELECT * FROM public.ventas WHERE id = v_venta.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.crear_venta_externa_piezas(text, text, integer, text) TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 4) crear_producto_joyeria: suma _medidas / _tallas (ficha técnica del
--    diseño; la talla REAL de cada pieza es piezas_inventario.talla).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_producto_joyeria (
  _nombre       text,
  _descripcion  text,
  _id_categoria integer,
  _id_marca     integer,
  _id_empresa   integer,
  _destacado    boolean DEFAULT false,
  _medidas      text DEFAULT NULL,
  _tallas       text DEFAULT NULL
)
  RETURNS integer
  LANGUAGE plpgsql
  AS $function$
DECLARE nuevo_id int;
BEGIN
  IF _nombre IS NULL OR btrim(_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del producto es obligatorio';
  END IF;

  PERFORM 1 FROM productos WHERE nombre = _nombre AND id_empresa = _id_empresa;
  IF FOUND THEN
    RAISE EXCEPTION 'Nombre de producto duplicado';
  END IF;

  INSERT INTO productos (
    nombre, descripcion, precio_venta, precio_compra, id_categoria, id_marca,
    id_empresa, sevende_por, maneja_inventarios, maneja_multiprecios, es_joyeria,
    destacado, medidas, tallas
  ) VALUES (
    _nombre, _descripcion, 0, 0, _id_categoria, _id_marca,
    _id_empresa, 'unidad', false, false, true,
    _destacado, _medidas, _tallas
  )
  RETURNING id INTO nuevo_id;

  RETURN nuevo_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.crear_producto_joyeria(text, text, integer, integer, integer, boolean, text, text)
  TO PUBLIC, anon, authenticated, postgres, service_role;


-- ----------------------------------------------------------------------------
-- 5) ecommerce_piezas_disponibles: agrega precio_oferta (el checkout la
--    revalida server-side igual, esto es solo para mostrarla en la UI).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_piezas_disponibles(bigint);

CREATE OR REPLACE FUNCTION public.ecommerce_piezas_disponibles(_id_variante bigint)
RETURNS TABLE (id_pieza bigint, sku text, peso numeric, precio_venta numeric, talla text, precio_oferta numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pz.id, pz.sku, pz.peso, pz.precio_venta, pz.talla, pz.precio_oferta
  FROM piezas_inventario pz
  WHERE pz.id_variante = _id_variante
    AND pz.id_empresa = public.ecommerce_id_empresa()
    AND pz.estado = 'disponible'
  ORDER BY pz.precio_venta ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_piezas_disponibles(bigint) TO anon, authenticated, service_role;
