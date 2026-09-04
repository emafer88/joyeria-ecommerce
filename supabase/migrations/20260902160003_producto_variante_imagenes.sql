-- Galería de imágenes por VARIANTE de joyería (material + pureza).
--
-- Espejo de `producto_imagenes` pero colgando de `producto_variantes` en vez
-- de `productos`: mismas columnas (path/url/orden), mismo bucket de storage
-- ("imagenes", carpeta `variantes/{id_variante}/...`), sin RLS y con los
-- mismos grants que el resto de tablas del esquema.
--
-- "Portada" de la variante = la fila con `orden` más bajo (no hay columna
-- dedicada); reordenar para que una imagen quede en `orden = 1` la vuelve
-- portada. El FK ON DELETE CASCADE limpia las filas si se borra la variante;
-- los archivos de storage se borran desde el frontend (EliminarImagenVariante).

CREATE TABLE "public"."producto_variante_imagenes" (
  "id"          bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_variante" bigint                   NOT NULL,
  "path"        text                     NOT NULL,
  "url"         text                     NOT NULL,
  "orden"       integer                  NOT NULL DEFAULT 1,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "producto_variante_imagenes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."producto_variante_imagenes"
  ADD CONSTRAINT "producto_variante_imagenes_id_variante_fkey"
  FOREIGN KEY (id_variante) REFERENCES public.producto_variantes(id) ON DELETE CASCADE;

CREATE INDEX idx_producto_variante_imagenes_id_variante
  ON public.producto_variante_imagenes USING btree (id_variante, orden);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."producto_variante_imagenes"
  TO "anon", "authenticated", "postgres", "service_role";
