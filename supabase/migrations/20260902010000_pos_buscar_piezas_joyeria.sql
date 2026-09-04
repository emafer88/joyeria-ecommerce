-- El buscador de Ventas (POS) tenía dos problemas:
--
-- 1) `buscarproductos`/`buscarproductoslectora` no filtraban `es_joyeria`,
--    así que un "diseño" de joyería (fila de productos con es_joyeria=true,
--    precio_venta=0, sin stock real) podía aparecer en la lista y agregarse
--    como un ítem fantasma de $0 que no reserva ni descuenta ninguna pieza.
-- 2) Las piezas físicas de joyería (piezas_inventario) solo se podían
--    encontrar por código EXACTO desde el botón flotante de escaneo
--    (pos_buscar_pieza), nunca por texto parcial desde el buscador principal.
--
-- Se corrige excluyendo los diseños de joyería de la búsqueda de productos
-- normales, y se agrega `pos_buscar_piezas_texto` para que el buscador
-- principal del POS también encuentre piezas por nombre/SKU/código parcial
-- (reutiliza el mismo flujo de reserva que ya usa el escáner flotante).

CREATE OR REPLACE FUNCTION public.buscarproductos (
  _id_empresa integer,
  buscador    text
)
  RETURNS TABLE (
    id                  integer,
    nombre              text,
    precio_venta        numeric,
    precio_compra       numeric,
    id_categoria        integer,
    sevende_por         text,
    codigo_barras       text,
    codigo_interno      text,
    id_empresa          integer,
    maneja_inventarios  boolean,
    maneja_multiprecios boolean,
    p_venta             text,
    p_compra            text,
    categoria           text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre,p.precio_venta,p.precio_compra,p.id_categoria,p.sevende_por,p.codigo_barras,p.codigo_interno,p.id_empresa,p.maneja_inventarios,p.maneja_multiprecios,concat(e.simbolo_moneda,' ', p.precio_venta) as p_venta,concat(e.simbolo_moneda,' ', p.precio_compra) as p_compra,c.nombre as categoria
  from productos as p inner join empresa as e on e.id=p.id_empresa
  inner join categorias as c on c.id=p.id_categoria
  where (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE
    ORDER BY p.nombre ASC
    LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.buscarproductoslectora (
  _id_empresa integer,
  buscador    text
)
  RETURNS TABLE (
    id                  integer,
    nombre              text,
    precio_venta        numeric,
    precio_compra       numeric,
    id_categoria        integer,
    sevende_por         text,
    codigo_barras       text,
    codigo_interno      text,
    id_empresa          integer,
    maneja_inventarios  boolean,
    maneja_multiprecios boolean,
    p_venta             text,
    p_compra            text,
    categoria           text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre,p.precio_venta,p.precio_compra,p.id_categoria,p.sevende_por,p.codigo_barras,p.codigo_interno,p.id_empresa,p.maneja_inventarios,p.maneja_multiprecios,concat(e.simbolo_moneda,' ', p.precio_venta) as p_venta,concat(e.simbolo_moneda,' ', p.precio_compra) as p_compra,c.nombre as categoria
  from productos as p inner join empresa as e on e.id=p.id_empresa
  inner join categorias as c on c.id=p.id_categoria
  where
    ( LOWER(p.codigo_barras) = LOWER(buscador)
    OR LOWER(p.codigo_interno) = LOWER(buscador))
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE;
$function$;

-- Búsqueda por texto parcial de piezas de joyería disponibles, para el
-- buscador principal del POS (mismo shape que pos_buscar_pieza, que sigue
-- existiendo para el escaneo por código exacto).
CREATE OR REPLACE FUNCTION public.pos_buscar_piezas_texto (
  _id_empresa integer,
  _buscador   text
)
  RETURNS TABLE (
    id_pieza     bigint,
    id_variante  bigint,
    id_producto  bigint,
    producto     text,
    categoria    text,
    material     text,
    pureza       text,
    sku          text,
    barcode      text,
    peso         numeric,
    costo        numeric,
    precio_venta numeric,
    estado       text,
    id_almacen   bigint
  )
  LANGUAGE sql
  STABLE
  AS $function$
  SELECT pi.id, pi.id_variante, pi.id_producto,
         p.nombre, c.nombre, v.material, v.pureza,
         pi.sku, pi.barcode, pi.peso, pi.costo, pi.precio_venta, pi.estado, pi.id_almacen
    FROM piezas_inventario pi
    JOIN producto_variantes v ON v.id = pi.id_variante
    JOIN productos p          ON p.id = pi.id_producto
    LEFT JOIN categorias c    ON c.id = p.id_categoria
   WHERE pi.id_empresa = _id_empresa
     AND pi.estado = 'disponible'
     AND (LOWER(p.nombre) LIKE '%' || LOWER(_buscador) || '%'
          OR LOWER(pi.sku) LIKE '%' || LOWER(_buscador) || '%'
          OR LOWER(pi.barcode) LIKE '%' || LOWER(_buscador) || '%')
   ORDER BY p.nombre ASC
   LIMIT 10;
$function$;

GRANT EXECUTE ON FUNCTION "public"."pos_buscar_piezas_texto"(integer, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
