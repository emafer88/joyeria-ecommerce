-- ============================================================================
-- Catálogo de códigos postales de México (dataset SEPOMEX / Correos de México).
-- ============================================================================
-- Dato de referencia público de solo lectura: alimenta el autocompletado de
-- la libreta de direcciones (tipeás el CP -> se resuelven estado y municipio,
-- y se ofrece la lista de colonias de ese CP).
--
-- Los datos NO se cargan acá: esta migración solo crea el esquema. El seed
-- (~145k filas colonia-CP) se corre aparte con scripts/seed-cp-mexico.mjs a
-- partir del CSV oficial, para no meter ~20 MB de SQL en el repo.
--
-- Una fila por combinación (cp, colonia): un mismo CP suele tener varias
-- colonias/asentamientos.
-- ============================================================================

CREATE TABLE public.cp_mexico (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cp                 text NOT NULL,
  colonia            text NOT NULL,
  tipo_asentamiento  text,
  municipio          text NOT NULL,
  estado             text NOT NULL,
  ciudad             text,
  zona               text,
  UNIQUE (cp, colonia)
);

CREATE INDEX cp_mexico_cp_idx ON public.cp_mexico (cp);

-- Referencia pública: cualquiera puede leerla, nadie la escribe desde el
-- Data API (el seed usa la service_role key).
ALTER TABLE public.cp_mexico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_mexico - lectura pública"
  ON public.cp_mexico
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.cp_mexico FROM PUBLIC;
GRANT SELECT ON public.cp_mexico TO anon, authenticated;
GRANT ALL ON public.cp_mexico TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- ecommerce_buscar_cp: dado un CP, devuelve sus colonias con estado/municipio.
-- El frontend toma estado/municipio/ciudad de la primera fila y arma el
-- <select> de colonias con `colonia`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecommerce_buscar_cp(_cp text)
RETURNS TABLE (
  estado            text,
  municipio         text,
  ciudad            text,
  colonia           text,
  tipo_asentamiento text
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.estado, c.municipio, c.ciudad, c.colonia, c.tipo_asentamiento
  FROM public.cp_mexico c
  WHERE c.cp = btrim(_cp)
  ORDER BY c.colonia;
$$;

GRANT EXECUTE ON FUNCTION public.ecommerce_buscar_cp(text) TO anon, authenticated, service_role;
