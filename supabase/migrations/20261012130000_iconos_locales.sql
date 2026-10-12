-- ============================================================================
-- Íconos de los módulos servidos por el propio admin (public/iconos/).
--
-- Estaban en i.ibb.co y en el Storage de un proyecto de Supabase ajeno (el
-- del tutorial, qkzybkelsdmoezaaypou): si cualquiera de los dos los borraba,
-- el menú de configuración de todos los clientes se quedaba sin íconos.
-- Se guarda solo el nombre del archivo como ruta relativa del admin.
--
-- Corre después del seed de 20261007130000_instalacion_limpia.sql, así que
-- también corrige las instalaciones nuevas.
-- ============================================================================
UPDATE public.modulos
   SET icono = '/iconos/' || substring(icono FROM '([^/?]+\.png)')
 WHERE icono ~ '^https://(i\.ibb\.co|qkzybkelsdmoezaaypou\.supabase\.co)/'
   AND substring(icono FROM '([^/?]+\.png)') IS NOT NULL;
