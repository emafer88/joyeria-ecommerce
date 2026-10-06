-- ============================================================================
-- Instalación limpia: que las migraciones sirvan para crear la base de una
-- joyería cliente nueva (un proyecto de Supabase por cliente).
--
--   1) La URL de las Edge Functions ya no va escrita en el código: se guarda
--      en licencia.url_proyecto (la pone el instalador; en la base original,
--      esta migración). Los crons y ml_pedir_sincronizacion la leen de ahí y
--      además solo llaman si el plan incluye la función.
--   2) Catálogo base que antes solo existía en la base original: roles,
--      tipo_comprobantes y modulos, con los mismos ids (las policies y el
--      front usan ids de módulos fijos).
--   3) Bucket `imagenes`.
--
-- En la base original todo esto es un no-op (salvo la URL y los crons).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) URL del proyecto.
-- ----------------------------------------------------------------------------
ALTER TABLE public.licencia ADD COLUMN IF NOT EXISTS url_proyecto text;

-- Solo la base original (que ya tiene usuarios) se queda con su URL; en una
-- base nueva la pone el instalador.
UPDATE public.licencia
   SET url_proyecto = 'https://yuyjoupristotpnnblva.supabase.co'
 WHERE id = 1 AND url_proyecto IS NULL
   AND EXISTS (SELECT 1 FROM public.usuarios);

-- NULL si no hay URL configurada.
CREATE OR REPLACE FUNCTION public.licencia_url_funcion(_nombre text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT rtrim(url_proyecto, '/') || '/functions/v1/' || _nombre
    FROM licencia
   WHERE id = 1 AND url_proyecto IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.licencia_url_funcion(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.licencia_url_funcion(text) TO service_role;

-- Mismo cuerpo que en 20260924120000_mercadolibre_sincronizacion.sql, con la
-- URL de licencia y sin llamar si el plan no incluye Mercado Libre.
CREATE OR REPLACE FUNCTION public.ml_pedir_sincronizacion(_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := licencia_url_funcion('ml-sincronizar');
BEGIN
  IF v_url IS NULL OR NOT licencia_tiene('mercadolibre') THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := _body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ml_pedir_sincronizacion(%): %', _body, SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_pedir_sincronizacion(jsonb) FROM PUBLIC, anon, authenticated;

-- Crons con la URL escrita: se reprograman igual pero leyendo licencia.
-- (ml-sincronizar ya llama a ml_pedir_sincronizacion, no hace falta tocarlo.)
SELECT cron.unschedule('ecommerce-liberar-reservas-vencidas')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ecommerce-liberar-reservas-vencidas');

SELECT cron.schedule(
    'ecommerce-liberar-reservas-vencidas',
    '*/10 * * * *',
    $$
    SELECT net.http_post(
        url := public.licencia_url_funcion('liberar-reservas-vencidas'),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    )
     WHERE public.licencia_tiene('tienda')
       AND public.licencia_url_funcion('liberar-reservas-vencidas') IS NOT NULL;
    $$
);

SELECT cron.unschedule('ml-reconciliar-ordenes')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ml-reconciliar-ordenes');

SELECT cron.schedule(
    'ml-reconciliar-ordenes',
    '7,22,37,52 * * * *',
    $$ SELECT net.http_post(
         url     := public.licencia_url_funcion('ml-webhook'),
         headers := '{"Content-Type": "application/json"}'::jsonb,
         body    := '{"reconciliar": true}'::jsonb
       )
        WHERE public.licencia_tiene('mercadolibre')
          AND public.licencia_url_funcion('ml-webhook') IS NOT NULL; $$
);


-- ----------------------------------------------------------------------------
-- 2) Catálogo base.
--
-- En una base nueva, migraciones anteriores ya insertaron algunos módulos
-- (Envío, Pedidos, Ver costos) con ids que no son los de la base original:
-- si todavía no hay usuarios (nadie tiene permisos), se borran y se vuelven
-- a crear con sus ids. En la base original no se toca nada.
-- ----------------------------------------------------------------------------
INSERT INTO public.roles (id, nombre) VALUES
  (1, 'superadmin'),
  (2, 'cajero'),
  (3, 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tipo_comprobantes (id, nombre, destino) VALUES
  (1, 'Factura', 'ventas'),
  (2, 'Boleta', 'ventas'),
  (3, 'Nota de credito', '-'),
  (4, 'Nota de debito', '-'),
  (5, 'Ticket', 'ventas')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuarios) THEN
    DELETE FROM public.modulos;
  END IF;
END $$;

INSERT INTO public.modulos (id, nombre, descripcion, icono, link, etiquetas) VALUES
  (1,  'Categorias de productos', 'asigna categorias a tus productos', 'https://i.ibb.co/VYbMRLZ/categoria.png', '/configuracion/categorias', '#configuracion'),
  (2,  'Productos', 'registra tus productos', 'https://i.ibb.co/85zJ6yG/caja-del-paquete.png', '/configuracion/productos', '#configuracion'),
  (3,  'Empresa', 'configura tu empresa', 'https://i.ibb.co/S0pkQWF/comercio-y-compras.png', '/configuracion/empresa', '#configuracion'),
  (4,  'Clientes', 'gestiona tus clientes', 'https://i.ibb.co/g4YBrpf/satisfecho.png', '/configuracion/clientes', '#configuracion'),
  (5,  'Proveedores', 'gestiona tus proveedores', 'https://i.ibb.co/q5rjxjG/proveedor.png', '/configuracion/proveedores', '#configuracion'),
  (6,  'Métodos de pago', 'gestiona tus métodos de pago', 'https://i.ibb.co/PtjvQkB/transferencia-movil.png', '/configuracion/metodospago', '#configuracion'),
  (7,  'Sucursales y cajas', 'gestiona tus sucursales y cajas', 'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/sucursales.png?t=2024-12-01T12%3A56%3A08.233Z', '/configuracion/sucursalcaja', '#configuracion'),
  (8,  'Usuarios', 'gestiona tus usuarios', 'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/escritorio-de-oficina.png?t=2024-12-01T12%3A58%3A35.579Z', '/configuracion/usuarios', '#configuracion'),
  (9,  'Impresoras', 'gestiona tus comprobantes de pago', 'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/impresora.png', '/configuracion/impresoras', '#configuracion'),
  (15, 'Configuracion', '-', '-', '/configuracion', '#operacion'),
  (16, 'Ventas', '-', '-', '/pos', '#operacion'),
  (17, 'Dashboard', '-', '-', '/dashboard', '#operacion'),
  (18, 'Cobrar venta', '-', '-', '-', '#operacion'),
  (19, 'Empresa basicos', '-', '-', '/configuracion/empresa/empresabasicos', '#operacion'),
  (20, 'Empresa moneda', '-', '-', '/configuracion/empresa/monedaconfig', '#operacion'),
  (21, 'Almacenes', 'gestiona tus almacenes por sucursales', 'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/almacen.png', '/configuracion/almacenes', '#configuracion'),
  (22, 'Home', '-', '-', '/', '#default'),
  (23, 'Inventarios', '-', '-', '/inventario', '#default'),
  (24, 'Configuración de ticket', 'configura tu ticket personalizado', 'https://i.ibb.co/Z1BQHJ92/boleto.png', '/configuracion/ticket', '#configuracion'),
  (25, 'Serialización de comprobantes', 'serializa tus comprobantes', 'https://i.ibb.co/xtCdPGhx/factura-2.png', '/configuracion/serializacion', '#configuracion'),
  (26, 'Reportes', '-', '-', '/reportes', '#operacion'),
  (27, 'Envío', 'configura el costo de envío del ecommerce', 'https://qkzybkelsdmoezaaypou.supabase.co/storage/v1/object/public/imagenes/modulos/almacen.png', '/configuracion/envio', '#configuracion'),
  (28, 'Pedidos', 'gestiona los pedidos del ecommerce', 'https://i.ibb.co/85zJ6yG/caja-del-paquete.png', '/pedidos', '#operacion'),
  (31, 'Ver costos', 'ver costos de compra y ganancias', 'https://i.ibb.co/85zJ6yG/caja-del-paquete.png', '#ver-costos', '#permiso')
ON CONFLICT (id) DO NOTHING;

-- Que los próximos ids no choquen con los insertados a mano.
SELECT setval(pg_get_serial_sequence('public.roles', 'id'),
              GREATEST((SELECT max(id) FROM public.roles), 1));
SELECT setval(pg_get_serial_sequence('public.tipo_comprobantes', 'id'),
              GREATEST((SELECT max(id) FROM public.tipo_comprobantes), 1));
SELECT setval(pg_get_serial_sequence('public.modulos', 'id'),
              GREATEST((SELECT max(id) FROM public.modulos), 1));


-- ----------------------------------------------------------------------------
-- 3) Bucket de imágenes (público; las policies están en
--    20261001120100_seguridad_storage_imagenes.sql).
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagenes', 'imagenes', true)
ON CONFLICT (id) DO NOTHING;
