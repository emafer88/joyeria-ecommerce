# Plan: integración con Mercado Libre

Objetivo: que Mercado Libre conozca el stock real de la joyería, conectando la publicación de productos a la misma base de Supabase que ya usan `joyeria-ecommerce` y `proyecto-joyeria`.

## El problema de fondo

Mercado Libre no tiene el concepto de "pieza física única con SKU propio" que ya existe en `piezas_inventario` (cada joya = 1 fila, `estado: disponible/reservada/vendida`). En ML, una publicación tiene `available_quantity`, no piezas individuales. Si se publica una joya única como si fuera stock normal, se corre el riesgo de venderla dos veces (una en la web propia, otra en ML) antes de que el stock se sincronice.

La solución ya existe en el patrón de Mercado Pago: reservar la pieza en el momento del intento de compra, confirmar recién cuando el pago está aprobado (ver `crear-preferencia-pago` + `webhook-mercadopago`). Mercado Libre necesita el mismo patrón, solo que el "intento de compra" lo dispara un webhook de ML en vez del checkout propio.

## Arquitectura recomendada

- **Repo nuevo** (o funciones dentro de uno existente) apuntando a la **misma base de Supabase** — mismo criterio multi-repo-una-base que ya usan `joyeria-ecommerce` y `proyecto-joyeria` (ver memoria `supabase-shared-db-dos-repos`).
- **Edge Functions** en Supabase, mismo estilo que `crear-preferencia-pago` / `webhook-mercadopago`:
  - `ml-sincronizar-catalogo` (push periódico o por trigger de precio/stock hacia ML)
  - `ml-webhook` (recibe notificaciones de ML: `orders_v2`, `items`)
  - reutilizar `reservar_pieza`, `liberar_pieza`, y generalizar `crear_venta_externa_piezas` con un `CANAL = 'mercadolibre'` nuevo (ya está pensada para eso — ver `_shared/constantes.ts`).
- **Tabla nueva** `integraciones_ml_tokens` (o similar), solo `service_role`, para guardar `access_token`/`refresh_token` de ML (expiran a las 6h, hay que refrescarlos con un cron, como `liberar-reservas-vencidas`).

## Mapeo del catálogo a ML

| Modelo propio | En ML |
|---|---|
| `productos` + `stock` (venta por cantidad) | 1 publicación normal, `available_quantity = stock.stock` |
| `piezas_inventario` (joya única, `es_joyeria=true`) | 1 publicación por pieza, `available_quantity = 1`, se **pausa** (no se borra) al vender |
| `producto_imagenes.url` | ya son URLs públicas — se mandan directo como `pictures` |
| `piezas_inventario.sku` | atributo `SELLER_SKU` en ML |

## Fases sugeridas (MVP incremental)

1. **Setup**: crear app en [Mercado Libre Developers](https://developers.mercadolibre.com.mx), obtener `client_id`/`client_secret`, hacer el flujo OAuth manual una vez (con un usuario de prueba/sandbox) y publicar un producto a mano vía Postman para entender qué atributos exige la categoría de joyería (suelen pedir marca, material, género — ya están en la ficha técnica existente).
2. **Push de catálogo, sin recibir pedidos todavía**: función que crea/actualiza publicaciones y sincroniza precio+stock. Arrancar **solo con productos por cantidad**, no con piezas únicas — mucho más simple y sin riesgo de doble venta mientras se valida el resto.
3. **Webhook de `orders_v2`**: cuando ML notifica una venta, reconsultar la orden real contra la API (nunca confiar en el body, igual que con MP) y confirmar la venta con `crear_venta_externa_piezas` (canal `mercadolibre`).
4. **Recién ahí sumar piezas únicas de joyería**: reservar la pieza al publicar (o publicar con `available_quantity=1` y pausar automáticamente en cuanto se reserva/vende por cualquier canal — web, POS o ML). Parte más delicada: vender por POS también tiene que pausar la publicación en ML, no solo al revés.
5. **Cancelaciones/devoluciones**: webhook o polling que libere la pieza (`liberar_pieza`) si la orden de ML se cancela.
6. **UI en el admin** (`proyecto-joyeria`): panel para ver qué productos están publicados en ML, activar/desactivar por producto, y ver errores de sincronización.

## Decisiones pendientes antes de arrancar

1. ¿Arrancamos solo con productos por cantidad y dejamos las piezas únicas para una segunda etapa? (recomendado, por el riesgo de doble venta).
2. Mercado Envíos o envío propio — cambia cómo se arma la publicación y qué costo de envío se carga.
3. ¿Ya hay cuenta de vendedor de Mercado Libre México activa? Si no, hay que crearla y pasar su verificación antes de poder probar en sandbox.

## Próximo paso

Arrancar con la Fase 1: OAuth + publicar un producto de prueba a mano, para confirmar credenciales y atributos obligatorios de la categoría de joyería.
