-- Funciones del giro que el negocio decide no usar (Configuración → Empresa
-- → Funciones). Solo se pueden apagar las que trae el giro de `licencia`;
-- encender una que el giro no trae no es posible (lo decide la app:
-- tiene() en src/hooks/useLicencia.jsx). Se guarda con el UPDATE normal de
-- empresa, igual que Básico.

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS funciones_apagadas text[] NOT NULL DEFAULT '{}'
    CHECK (funciones_apagadas <@ ARRAY['piezas', 'granel', 'apartados', 'tallas']);
