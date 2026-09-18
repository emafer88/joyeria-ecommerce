-- Defensa en profundidad, consistente con el resto de las RPC que dependen
-- de auth.uid() (ver ecommerce_mis_pedidos): sin esto, `anon` técnicamente
-- puede ejecutar estas funciones (heredan EXECUTE de PUBLIC por default),
-- aunque el filtro por auth.uid() ya les impide ver/tocar datos ajenos.
REVOKE ALL ON FUNCTION public.ecommerce_mi_perfil() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ecommerce_actualizar_mi_telefono(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ecommerce_listar_favoritos() FROM PUBLIC, anon;
