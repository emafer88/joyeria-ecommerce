-- Agrega imagen (portada del producto) y sku (de la pieza de joyería
-- vendida, cuando aplica) a cada item de admin_detalle_pedido_ecommerce,
-- para mostrarlos en el modal de detalle del panel admin. El sku solo
-- existe para piezas serializadas (detalle_venta.id_pieza no nulo); los
-- productos por cantidad no tienen pieza individual con sku propio.
CREATE OR REPLACE FUNCTION public.admin_detalle_pedido_ecommerce(_id_venta bigint)
RETURNS TABLE (
  destinatario    text,
  telefono        text,
  email           text,
  cp              text,
  estado          text,
  municipio       text,
  colonia         text,
  calle           text,
  numero_exterior text,
  numero_interior text,
  entre_calles    text,
  referencias     text,
  items           jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.destinatario, e.telefono, e.email,
    e.cp, e.estado, e.municipio, e.colonia, e.calle,
    e.numero_exterior, e.numero_interior, e.entre_calles, e.referencias,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nombre', COALESCE(p.nombre, d.descripcion, 'Producto'),
        'cantidad', d.cantidad,
        'total', d.total,
        'imagen', (
          SELECT pi.url FROM public.producto_imagenes pi
           WHERE pi.id_producto = d.id_producto
           ORDER BY pi.orden ASC LIMIT 1
        ),
        'sku', pz.sku
      ))
      FROM public.detalle_venta d
      LEFT JOIN public.productos p ON p.id = d.id_producto
      LEFT JOIN public.piezas_inventario pz ON pz.id = d.id_pieza
      WHERE d.id_venta = v.id
    ), '[]'::jsonb) AS items
  FROM public.ventas v
  LEFT JOIN public.ecommerce_orden_envio e ON e.id_orden_externa = v.id_orden_externa
  WHERE v.id = _id_venta AND v.origen = 'ecommerce';
$$;

GRANT EXECUTE ON FUNCTION public.admin_detalle_pedido_ecommerce(bigint) TO authenticated, service_role;
