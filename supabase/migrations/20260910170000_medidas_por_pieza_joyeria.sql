-- ============================================================================
-- Joyería: medidas y talla por PIEZA, no por diseño.
-- ============================================================================
-- Reconsiderado sobre 20260910130000/20260910150000: dos piezas del mismo
-- diseño/variante pueden pesar y medir distinto (son físicas, no un molde
-- exacto), así que "medidas" a nivel diseño no representaba nada real. Se
-- saca de `productos` (que sigue sirviendo para producto NORMAL, sin piezas)
-- y se agrega a `piezas_inventario`, igual que ya se hizo con `talla`.
--
-- Esto obliga a sacar `crear_producto_joyeria(..., _medidas, _tallas)`: si
-- quedaran los dos overloads (6 args y 8 args) y el form dejara de mandar
-- _medidas/_tallas, la llamada sería ambigua para Postgres (probado: "is not
-- unique" al invocar con 6 args habiendo un overload de 8 con defaults).
-- ============================================================================

ALTER TABLE public.piezas_inventario
  ADD COLUMN IF NOT EXISTS medidas text NULL;

COMMENT ON COLUMN public.piezas_inventario.medidas IS
  'Medidas de esta pieza física puntual (ej. "45 cm"), texto libre.';

-- Ningún diseño real llegó a usar esto (verificado antes de este migration),
-- pero se limpia por las dudas: medidas/tallas de productos.* ya no aplica
-- a joyería, solo a producto normal (sevende_por unidad/graneles).
UPDATE public.productos SET medidas = NULL, tallas = NULL WHERE es_joyeria = true;

-- Saca el overload que agregaba _medidas/_tallas al diseño (20260910150000).
-- Quedan los dos overloads previos (5 y 6 args, con/sin _destacado).
DROP FUNCTION IF EXISTS public.crear_producto_joyeria(text, text, integer, integer, integer, boolean, text, text);


-- ----------------------------------------------------------------------------
-- ajustar_pieza: suma _medidas (nuevo overload; el front ahora manda siempre
-- las 11 claves, así que no queda ambigüedad con los overloads anteriores).
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
  _quitar_oferta boolean DEFAULT false,
  _medidas text DEFAULT NULL
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
         medidas       = coalesce(_medidas, medidas),
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

GRANT EXECUTE ON FUNCTION public.ajustar_pieza(integer, integer, integer, numeric, numeric, numeric, text, text, numeric, boolean, text)
  TO PUBLIC, anon, authenticated, postgres, service_role;


-- ----------------------------------------------------------------------------
-- crear_piezas_masivo: cada línea puede traer "medidas" además de "talla".
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
  v_medidas    text;
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

  UPDATE producto_variantes
     SET ultimo_correlativo = ultimo_correlativo + v_total,
         updated_at = now()
   WHERE id = _id_variante
   RETURNING ultimo_correlativo INTO v_last;
  v_counter := v_last - v_total + 1;

  FOR v_linea IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    v_cant    := (v_linea->>'cantidad')::int;
    v_peso    := (v_linea->>'peso')::numeric;
    v_costo   := coalesce((v_linea->>'costo')::numeric, 0);
    v_precio  := (v_linea->>'precio_venta')::numeric;
    v_talla   := NULLIF(btrim(v_linea->>'talla'), '');
    v_medidas := NULLIF(btrim(v_linea->>'medidas'), '');

    FOR i IN 1..v_cant LOOP
      v_sku     := v_prefijo || '-' || lpad(v_counter::text, 4, '0');
      v_barcode := public.joyeria_ean13(_id_empresa, nextval('public.joyeria_barcode_seq'));

      INSERT INTO piezas_inventario (
        id_variante, id_producto, id_empresa, id_almacen,
        sku, barcode, peso, costo, precio_venta, talla, medidas, estado
      ) VALUES (
        _id_variante, v_id_producto, _id_empresa, _id_almacen,
        v_sku, v_barcode, v_peso, v_costo, v_precio, v_talla, v_medidas, 'disponible'
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
-- ecommerce_piezas_disponibles / joyeria_inventario_listado: suman medidas.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_piezas_disponibles(bigint);

CREATE OR REPLACE FUNCTION public.ecommerce_piezas_disponibles(_id_variante bigint)
RETURNS TABLE (id_pieza bigint, sku text, peso numeric, precio_venta numeric, talla text, medidas text, precio_oferta numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pz.id, pz.sku, pz.peso, pz.precio_venta, pz.talla, pz.medidas, pz.precio_oferta
  FROM piezas_inventario pz
  WHERE pz.id_variante = _id_variante
    AND pz.id_empresa = public.ecommerce_id_empresa()
    AND pz.estado = 'disponible'
  ORDER BY pz.precio_venta ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_piezas_disponibles(bigint) TO anon, authenticated, service_role;


DROP FUNCTION IF EXISTS public.joyeria_inventario_listado(integer);

CREATE OR REPLACE FUNCTION public.joyeria_inventario_listado(_id_empresa integer)
RETURNS TABLE(
  id_categoria bigint, categoria text, id_producto bigint, producto text,
  id_marca bigint, id_variante bigint, material text, pureza text,
  sku_prefijo text, id_pieza bigint, sku text, barcode text, peso numeric,
  costo numeric, precio_venta numeric, precio_oferta numeric, talla text,
  medidas text, estado text, id_almacen bigint, almacen text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  SELECT c.id, c.nombre,
         p.id, p.nombre, p.id_marca,
         v.id, v.material, v.pureza, v.sku_prefijo,
         pi.id, pi.sku, pi.barcode,
         pi.peso, pi.costo, pi.precio_venta, pi.precio_oferta, pi.talla,
         pi.medidas,
         pi.estado,
         pi.id_almacen, a.nombre,
         pi.created_at
    FROM piezas_inventario pi
    JOIN producto_variantes v ON v.id = pi.id_variante
    JOIN productos p          ON p.id = pi.id_producto
    LEFT JOIN categorias c    ON c.id = p.id_categoria
    LEFT JOIN almacen a       ON a.id = pi.id_almacen
   WHERE pi.id_empresa = _id_empresa
   ORDER BY c.nombre, p.nombre, v.material, v.pureza, pi.id;
$function$;

GRANT EXECUTE ON FUNCTION public.joyeria_inventario_listado(integer)
  TO PUBLIC, anon, authenticated, postgres, service_role;
