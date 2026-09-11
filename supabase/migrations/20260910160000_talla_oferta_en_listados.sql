-- ============================================================================
-- joyeria_inventario_listado: suma talla y precio_oferta.
-- ============================================================================
-- Alimenta la tabla de inventario del panel (TablaInventarioJoyeria) y el
-- prellenado de FormMovimientoPieza al abrir el ajuste de una pieza puntual.
-- Sin esto, ajustar una pieza desde esa pantalla no mostraba su talla/oferta
-- actuales (mismo problema que tenía mostrarproductos con destacado/oferta,
-- ver 20260910120000_ecommerce_detalle_completo.sql).
-- ============================================================================

DROP FUNCTION IF EXISTS public.joyeria_inventario_listado(integer);

CREATE OR REPLACE FUNCTION public.joyeria_inventario_listado(_id_empresa integer)
RETURNS TABLE(
  id_categoria bigint, categoria text, id_producto bigint, producto text,
  id_marca bigint, id_variante bigint, material text, pureza text,
  sku_prefijo text, id_pieza bigint, sku text, barcode text, peso numeric,
  costo numeric, precio_venta numeric, precio_oferta numeric, talla text,
  estado text, id_almacen bigint, almacen text, created_at timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  SELECT c.id, c.nombre,
         p.id, p.nombre, p.id_marca,
         v.id, v.material, v.pureza, v.sku_prefijo,
         pi.id, pi.sku, pi.barcode,
         pi.peso, pi.costo, pi.precio_venta, pi.precio_oferta, pi.talla,
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
