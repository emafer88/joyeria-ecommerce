-- ============================================================================
-- Ecommerce: libreta de direcciones del comprador + snapshot de envío por orden.
-- ============================================================================
--   ecommerce_direccion     : direcciones guardadas del usuario (CRUD directo
--                             desde el front, protegido por RLS).
--   ecommerce_orden_envio   : copia inmutable de la dirección elegida al
--                             momento de comprar (no FK: si el usuario borra
--                             o edita la dirección, el pedido igual muestra a
--                             dónde se envió). La escribe crear-preferencia-pago.
--
-- Estructura de dirección mexicana: CP ancla estado + municipio + colonia
-- (un CP tiene varias colonias -> ver cp_mexico / ecommerce_buscar_cp).
-- `numero_exterior` admite "SN" (sin número). `colonia` admite texto libre
-- cuando el CP no la lista. `lat`/`lng` vienen del pin del mapa y pueden ser
-- NULL (si Google Maps no cargó, el form sigue funcionando).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Libreta de direcciones.
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecommerce_direccion (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  etiqueta          text,
  destinatario      text NOT NULL,
  telefono          text NOT NULL,
  cp                text NOT NULL,
  estado            text NOT NULL,
  municipio         text NOT NULL,
  colonia           text NOT NULL,
  calle             text NOT NULL,
  numero_exterior   text NOT NULL,
  numero_interior   text,
  entre_calles      text,
  referencias       text,
  lat               double precision,
  lng               double precision,
  es_predeterminada boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ecommerce_direccion_user_idx ON public.ecommerce_direccion (user_id);

-- Como mucho una predeterminada por usuario.
CREATE UNIQUE INDEX ecommerce_direccion_predeterminada_key
  ON public.ecommerce_direccion (user_id)
  WHERE es_predeterminada;

ALTER TABLE public.ecommerce_direccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direccion propia - select"
  ON public.ecommerce_direccion FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "direccion propia - insert"
  ON public.ecommerce_direccion FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "direccion propia - update"
  ON public.ecommerce_direccion FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "direccion propia - delete"
  ON public.ecommerce_direccion FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

REVOKE ALL ON public.ecommerce_direccion FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_direccion TO authenticated;
GRANT ALL ON public.ecommerce_direccion TO postgres, service_role;


-- Una sola predeterminada: al marcar una, se desmarcan las demás del usuario.
-- La primera dirección del usuario queda predeterminada sí o sí.
CREATE OR REPLACE FUNCTION public.ecommerce_direccion_predeterminada_biu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NOT EXISTS (
       SELECT 1 FROM public.ecommerce_direccion WHERE user_id = NEW.user_id
     )
  THEN
    NEW.es_predeterminada := true;
  END IF;

  IF NEW.es_predeterminada THEN
    UPDATE public.ecommerce_direccion
       SET es_predeterminada = false, updated_at = now()
     WHERE user_id = NEW.user_id
       AND es_predeterminada
       AND id IS DISTINCT FROM NEW.id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ecommerce_direccion_predeterminada
  BEFORE INSERT OR UPDATE ON public.ecommerce_direccion
  FOR EACH ROW EXECUTE FUNCTION public.ecommerce_direccion_predeterminada_biu();


-- ----------------------------------------------------------------------------
-- 2) Snapshot de envío por orden. La escribe crear-preferencia-pago
--    (service_role) con la dirección elegida/tipeada en el checkout. Guest:
--    user_id NULL. Se ve vía RLS (usuario) o vía la Edge Function
--    estado-pedido (service_role, como el resto del detalle del pedido).
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecommerce_orden_envio (
  id_orden_externa text PRIMARY KEY,
  user_id          uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  destinatario     text NOT NULL,
  telefono         text NOT NULL,
  cp               text NOT NULL,
  estado           text NOT NULL,
  municipio        text NOT NULL,
  colonia          text NOT NULL,
  calle            text NOT NULL,
  numero_exterior  text NOT NULL,
  numero_interior  text,
  entre_calles     text,
  referencias      text,
  lat              double precision,
  lng              double precision,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ecommerce_orden_envio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envio propio - select"
  ON public.ecommerce_orden_envio FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

REVOKE ALL ON public.ecommerce_orden_envio FROM PUBLIC, anon;
GRANT SELECT ON public.ecommerce_orden_envio TO authenticated;
GRANT ALL ON public.ecommerce_orden_envio TO postgres, service_role;
