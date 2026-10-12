-- ============================================================================
-- Restablecer la contraseña de un empleado desde la pantalla Usuarios.
--
-- Mismo enfoque que crearcredencialesuser (escribe directo en auth.users con
-- crypt/bcrypt, que es lo que usa Supabase Auth), sin Edge Function: así
-- funciona en cada cliente solo con las migraciones.
--
-- Reglas:
--   * Solo gerente (superadmin o admin).
--   * Un admin no puede restablecer a otro gerente: solo un superadmin puede
--     (si no, un admin podría quedarse con la cuenta del dueño).
--   * La propia contraseña no: para eso está "Cambiar contraseña", que pide
--     la actual.
--   * Solo cuentas de correo y contraseña: a quien entra con Google se le
--     agregaría una contraseña que no usa.
--   * Cierra las sesiones abiertas del empleado (tendrá que entrar con la
--     nueva; el token que ya tiene vence solo en ~1 h).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_restablecer_contrasena(_id_usuario integer, _pass text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_id_auth uuid;
  v_rol text;
BEGIN
  PERFORM admin_exigir_gerente();

  IF length(coalesce(_pass, '')) < 8 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres'
      USING ERRCODE = '22023';
  END IF;

  SELECT u.id_auth::uuid, r.nombre
    INTO v_id_auth, v_rol
    FROM usuarios u
    LEFT JOIN roles r ON r.id = u.id_rol
   WHERE u.id = _id_usuario;
  IF v_id_auth IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF v_id_auth = auth.uid() THEN
    RAISE EXCEPTION 'Para tu propia contraseña usa la opción "Contraseña" del menú'
      USING ERRCODE = '42501';
  END IF;

  IF v_rol IN ('superadmin', 'admin') AND NOT admin_es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadmin puede restablecer la contraseña de un administrador'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
     WHERE id = v_id_auth
       AND raw_app_meta_data -> 'providers' ? 'email'
  ) THEN
    RAISE EXCEPTION 'Este usuario entra con Google: no tiene contraseña que restablecer'
      USING ERRCODE = '22023';
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(_pass, gen_salt('bf')),
         updated_at = now()
   WHERE id = v_id_auth;

  -- Los refresh tokens se borran en cascada con la sesión.
  DELETE FROM auth.sessions WHERE user_id = v_id_auth;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restablecer_contrasena(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restablecer_contrasena(integer, text) TO authenticated, service_role;
