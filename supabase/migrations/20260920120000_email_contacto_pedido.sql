-- Email de contacto del comprador, para pedidos de invitados (sin cuenta) que
-- hoy no dejan ningún dato de contacto en la base. Se guarda en el snapshot
-- de envío del pedido (ecommerce_orden_envio), no en la dirección guardada:
-- es un dato del comprador de ESE pedido, no de la libreta de direcciones.
ALTER TABLE public.ecommerce_orden_envio
  ADD COLUMN IF NOT EXISTS email text NULL;
