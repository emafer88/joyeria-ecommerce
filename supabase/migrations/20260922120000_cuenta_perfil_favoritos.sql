-- ============================================================================
-- Cuenta del cliente: Perfil (solo teléfono) + Favoritos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Perfil: lectura + escritura del teléfono. La fila en
--    ecommerce_cliente_perfil recién se crea en el primer checkout
--    (ecommerce_vincular_cliente) — si todavía no existe, se reusa esa misma
--    función para crearla en vez de duplicar su lógica.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_mi_perfil()
RETURNS TABLE (nombre text, email text, telefono text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT nombre, email, telefono FROM public.ecommerce_cliente_perfil WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_mi_perfil() TO authenticated;

CREATE OR REPLACE FUNCTION public.ecommerce_actualizar_mi_telefono(_telefono text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_nombre text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'requiere sesión';
  END IF;

  UPDATE public.ecommerce_cliente_perfil SET telefono = _telefono WHERE user_id = v_uid;

  IF NOT FOUND THEN
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
      INTO v_email, v_nombre FROM auth.users WHERE id = v_uid;
    PERFORM public.ecommerce_vincular_cliente(v_uid, v_email, v_nombre, _telefono);
  END IF;

  UPDATE public.clientes_proveedores cp SET telefono = _telefono
  FROM public.ecommerce_cliente_perfil p
  WHERE p.user_id = v_uid AND cp.id = p.id_cliente;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_actualizar_mi_telefono(text) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2) Favoritos: tabla propia con RLS por usuario (insert/delete directo
--    desde el frontend, sin RPC dedicada para eso) + RPC de listado con el
--    mismo shape de fila que ecommerce_listar_productos para reusar
--    TarjetaProducto.tsx tal cual.
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecommerce_favorito (
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id_producto bigint NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id_producto)
);

ALTER TABLE public.ecommerce_favorito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoritos propios"
  ON public.ecommerce_favorito FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.ecommerce_favorito FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.ecommerce_favorito TO authenticated;
GRANT ALL ON public.ecommerce_favorito TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.ecommerce_listar_favoritos()
RETURNS TABLE (
  id bigint,
  nombre text,
  descripcion text,
  precio_venta numeric,
  id_categoria bigint,
  categoria text,
  es_joyeria boolean,
  imagen_portada text,
  total_disponible numeric,
  destacado boolean,
  precio_oferta numeric,
  marca text,
  etiquetas text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id, p.nombre, p.descripcion, p.precio_venta, p.id_categoria, c.nombre AS categoria,
    p.es_joyeria,
    (
      SELECT pi.url FROM producto_imagenes pi
      WHERE pi.id_producto = p.id
      ORDER BY pi.orden ASC LIMIT 1
    ) AS imagen_portada,
    CASE
      WHEN p.es_joyeria THEN (
        SELECT count(*)::numeric FROM piezas_inventario pz
        WHERE pz.id_producto = p.id AND pz.estado = 'disponible'
      )
      WHEN p.maneja_inventarios THEN (
        SELECT COALESCE(sum(s.stock), 0) FROM stock s
        WHERE s.id_producto = p.id
      )
      ELSE NULL
    END AS total_disponible,
    p.destacado,
    CASE
      WHEN p.precio_oferta IS NOT NULL
       AND (p.oferta_desde IS NULL OR now() >= p.oferta_desde)
       AND (p.oferta_hasta IS NULL OR now() <= p.oferta_hasta)
      THEN p.precio_oferta
      ELSE NULL
    END AS precio_oferta,
    (SELECT m.nombre FROM marca m WHERE m.id = p.id_marca) AS marca,
    COALESCE((
      SELECT array_agg(e.nombre ORDER BY e.nombre)
      FROM producto_etiquetas pe
      JOIN etiquetas e ON e.id = pe.id_etiqueta
      WHERE pe.id_producto = p.id
    ), '{}') AS etiquetas
  FROM public.ecommerce_favorito f
  JOIN public.productos p ON p.id = f.id_producto
  JOIN public.categorias c ON c.id = p.id_categoria
  WHERE f.user_id = auth.uid() AND p.activo = true
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_listar_favoritos() TO authenticated;
