-- ============================================================================
-- Seguridad: bucket `imagenes`.
--
-- Las policies que había (creadas desde el dashboard) dejaban a cualquiera,
-- incluso sin sesión (rol `public`), subir, reemplazar y borrar fotos del
-- bucket; y a cualquier logueado (clientes del ecommerce incluidos) lo mismo
-- en la carpeta private/. Ahora: leer, todos (el bucket es público y el
-- ecommerce muestra estas fotos); escribir, solo el personal del admin.
-- ============================================================================

DROP POLICY IF EXISTS "permisos_imagenes 1ktc4f5_0" ON storage.objects;
DROP POLICY IF EXISTS "permisos_imagenes 1ktc4f5_1" ON storage.objects;
DROP POLICY IF EXISTS "permisos_imagenes 1ktc4f5_2" ON storage.objects;
DROP POLICY IF EXISTS "permisos_imagenes 1ktc4f5_3" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ktc4f5_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ktc4f5_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ktc4f5_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ktc4f5_3" ON storage.objects;

CREATE POLICY imagenes_leer ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'imagenes');

CREATE POLICY imagenes_subir_personal ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imagenes' AND (SELECT public.admin_es_personal()));

CREATE POLICY imagenes_editar_personal ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imagenes' AND (SELECT public.admin_es_personal()))
  WITH CHECK (bucket_id = 'imagenes' AND (SELECT public.admin_es_personal()));

CREATE POLICY imagenes_borrar_personal ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imagenes' AND (SELECT public.admin_es_personal()));
