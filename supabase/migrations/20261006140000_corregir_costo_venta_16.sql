-- ============================================================================
-- Corregir el costo de una línea de la venta de prueba 16 (2026-08-20).
--
-- La línea 29 quedó con precio_compra = 300710425478949: "300" seguido del
-- código de barras del producto 11 (el lector lo tecleó en el campo de
-- costo). Su ganancia (-3 mil billones) arruinaba la de todo el Dashboard.
-- Se le pone el costo actual del producto, que es lo que hoy pondría la base
-- (trigger detalle_venta_costo_bi de 20261006120000_ocultar_costo.sql).
-- El WHERE por el valor exacto la deja intacta si ya se corrigió a mano.
-- ============================================================================
UPDATE public.detalle_venta dv
   SET precio_compra = p.precio_compra
  FROM public.productos p
 WHERE dv.id = 29
   AND dv.precio_compra = 300710425478949
   AND p.id = dv.id_producto;
