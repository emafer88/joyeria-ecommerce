-- ============================================================================
-- Joyería: agrupar piezas físicamente iguales (mismo peso + talla + medidas)
-- dentro de una misma variante, para que el ecommerce muestre una sola tarjeta
-- por grupo en vez de repetir una fila por cada SKU idéntico.
-- ============================================================================
-- Decisiones (ver charla del feature):
--   - La clave de agrupamiento es solo física: peso + talla + medidas. El
--     precio NO entra en la comparación (una oferta puntual en una pieza no
--     debería partir el grupo) — si hay variación de precio dentro de un
--     grupo, el front la muestra como "desde $X" en vez de un precio fijo.
--   - El peso debe coincidir EXACTO (no hay tolerancia/redondeo). Si en la
--     práctica esto no fusiona lotes que deberían ser "la misma pieza", se
--     ajusta después con una tolerancia.
--   - `id_grupo` sale de una secuencia propia, NO del id de una pieza en
--     particular: una pieza se puede borrar (si no está vendida, ver trigger
--     joyeria_pieza_bd) y el grupo no puede depender de que esa fila exista.
--   - La asignación de grupo se recalcula tanto al crear piezas
--     (crear_piezas_masivo) como al editar peso/talla/medidas de una pieza
--     existente (ajustar_pieza), usando la misma función de búsqueda, para
--     que una edición nunca deje un grupo desincronizado.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.piezas_grupo_seq;

ALTER TABLE public.piezas_inventario
  ADD COLUMN IF NOT EXISTS id_grupo bigint NULL;

COMMENT ON COLUMN public.piezas_inventario.id_grupo IS
  'Agrupa piezas físicamente iguales (mismo peso+talla+medidas) de una misma variante. Viene de piezas_grupo_seq, no del id de ninguna pieza puntual.';

CREATE INDEX IF NOT EXISTS idx_piezas_inventario_id_grupo
  ON public.piezas_inventario (id_grupo);


-- ----------------------------------------------------------------------------
-- 1) joyeria_grupo_pieza: busca un grupo existente que coincida en
--    peso+talla+medidas dentro de la misma variante/empresa. Devuelve NULL si
--    no hay ninguno (el llamador arma un grupo nuevo con nextval).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.joyeria_grupo_pieza(
  _id_variante bigint,
  _id_empresa  integer,
  _peso        numeric,
  _talla       text,
  _medidas     text,
  _excluir_id  bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT id_grupo
    FROM piezas_inventario
   WHERE id_variante = _id_variante
     AND id_empresa = _id_empresa
     AND peso = _peso
     AND coalesce(talla, '') = coalesce(_talla, '')
     AND coalesce(medidas, '') = coalesce(_medidas, '')
     AND id_grupo IS NOT NULL
     AND (_excluir_id IS NULL OR id <> _excluir_id)
   ORDER BY id
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.joyeria_grupo_pieza(bigint, integer, numeric, text, text, bigint)
  TO PUBLIC, anon, authenticated, postgres, service_role;


-- ----------------------------------------------------------------------------
-- 2) Backfill: agrupa las piezas ya cargadas antes de este migration.
-- ----------------------------------------------------------------------------
WITH claves AS (
  SELECT DISTINCT
    id_variante,
    peso,
    coalesce(talla, '')   AS talla,
    coalesce(medidas, '') AS medidas
  FROM public.piezas_inventario
  WHERE id_grupo IS NULL
),
asignados AS (
  SELECT *, nextval('public.piezas_grupo_seq') AS nuevo_grupo FROM claves
)
UPDATE public.piezas_inventario pi
   SET id_grupo = a.nuevo_grupo
  FROM asignados a
 WHERE pi.id_grupo IS NULL
   AND pi.id_variante = a.id_variante
   AND pi.peso = a.peso
   AND coalesce(pi.talla, '')   = a.talla
   AND coalesce(pi.medidas, '') = a.medidas;


-- ----------------------------------------------------------------------------
-- 3) crear_piezas_masivo: cada línea (mismo peso/talla/medidas para todas las
--    copias de esa línea) busca o crea su grupo una sola vez.
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
  v_grupo      bigint;
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

    v_grupo := public.joyeria_grupo_pieza(_id_variante, _id_empresa, v_peso, v_talla, v_medidas);
    IF v_grupo IS NULL THEN
      v_grupo := nextval('public.piezas_grupo_seq');
    END IF;

    FOR i IN 1..v_cant LOOP
      v_sku     := v_prefijo || '-' || lpad(v_counter::text, 4, '0');
      v_barcode := public.joyeria_ean13(_id_empresa, nextval('public.joyeria_barcode_seq'));

      INSERT INTO piezas_inventario (
        id_variante, id_producto, id_empresa, id_almacen,
        sku, barcode, peso, costo, precio_venta, talla, medidas, id_grupo, estado
      ) VALUES (
        _id_variante, v_id_producto, _id_empresa, _id_almacen,
        v_sku, v_barcode, v_peso, v_costo, v_precio, v_talla, v_medidas, v_grupo, 'disponible'
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
-- 4) ajustar_pieza: si cambia peso/talla/medidas, recalcula el grupo con la
--    misma función (excluyéndose a sí misma de la búsqueda).
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
  v_peso_nuevo numeric;
  v_talla_nueva text;
  v_medidas_nuevas text;
  v_grupo bigint;
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

  v_peso_nuevo     := coalesce(_peso, v_ant.peso);
  v_talla_nueva    := coalesce(_talla, v_ant.talla);
  v_medidas_nuevas := coalesce(_medidas, v_ant.medidas);

  v_grupo := public.joyeria_grupo_pieza(
    v_ant.id_variante, _id_empresa, v_peso_nuevo, v_talla_nueva, v_medidas_nuevas, _id_pieza
  );
  IF v_grupo IS NULL THEN
    v_grupo := nextval('public.piezas_grupo_seq');
  END IF;

  UPDATE piezas_inventario
     SET peso          = v_peso_nuevo,
         costo         = coalesce(_costo, costo),
         precio_venta  = coalesce(_precio_venta, precio_venta),
         nota          = coalesce(_nota, nota),
         talla         = v_talla_nueva,
         medidas       = v_medidas_nuevas,
         id_grupo      = v_grupo,
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
-- 5) ecommerce_piezas_disponibles: suma id_grupo para que el front agrupe.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ecommerce_piezas_disponibles(bigint);

CREATE OR REPLACE FUNCTION public.ecommerce_piezas_disponibles(_id_variante bigint)
RETURNS TABLE (id_pieza bigint, sku text, peso numeric, precio_venta numeric, talla text, medidas text, precio_oferta numeric, id_grupo bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pz.id, pz.sku, pz.peso, pz.precio_venta, pz.talla, pz.medidas, pz.precio_oferta, pz.id_grupo
  FROM piezas_inventario pz
  WHERE pz.id_variante = _id_variante
    AND pz.id_empresa = public.ecommerce_id_empresa()
    AND pz.estado = 'disponible'
  ORDER BY pz.precio_venta ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_piezas_disponibles(bigint) TO anon, authenticated, service_role;
