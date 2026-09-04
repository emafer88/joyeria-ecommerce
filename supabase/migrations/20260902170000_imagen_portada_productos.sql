-- La tabla del catálogo de productos (TablaProductos.jsx) tiene una columna
-- "Imagen" que lee `imagen_portada`, pero los RPC que la alimentan
-- (mostrarproductos / buscarproductos / buscarproductoslectora) nunca
-- devolvían ese campo, así que la miniatura siempre salía vacía.
--
-- Se recrean los tres agregando `imagen_portada text` = la primera imagen
-- de `producto_imagenes` por `orden` (misma definición de "portada" que en
-- las variantes de joyería). Hay que DROP + CREATE porque cambia el shape
-- de retorno (CREATE OR REPLACE no permite agregar columnas al RETURNS
-- TABLE); se vuelve a otorgar el GRANT EXECUTE que el DROP se lleva.
--
-- Los cuerpos son idénticos a la última versión de cada función
-- (20260901235000 + 20260902010000): mismo WHERE, mismo filtro es_joyeria
-- donde ya estaba, solo se suma la subconsulta de la portada.

DROP FUNCTION IF EXISTS public.mostrarproductos(integer);

CREATE FUNCTION public.mostrarproductos (
  _id_empresa integer
)
  RETURNS TABLE (
    id                  integer,
    nombre              text,
    precio_venta        numeric,
    precio_compra       numeric,
    id_categoria        integer,
    sevende_por         text,
    codigo_barras       text,
    codigo_interno      text,
    id_empresa          integer,
    maneja_inventarios  boolean,
    maneja_multiprecios boolean,
    p_venta             text,
    p_compra            text,
    categoria           text,
    imagen_portada      text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 concat(e.simbolo_moneda, ' ', p.precio_compra) as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada
  from productos as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where p.id_empresa = _id_empresa and p.activo;
$function$;

GRANT EXECUTE ON FUNCTION public.mostrarproductos(integer)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

DROP FUNCTION IF EXISTS public.buscarproductos(integer, text);

CREATE FUNCTION public.buscarproductos (
  _id_empresa integer,
  buscador    text
)
  RETURNS TABLE (
    id                  integer,
    nombre              text,
    precio_venta        numeric,
    precio_compra       numeric,
    id_categoria        integer,
    sevende_por         text,
    codigo_barras       text,
    codigo_interno      text,
    id_empresa          integer,
    maneja_inventarios  boolean,
    maneja_multiprecios boolean,
    p_venta             text,
    p_compra            text,
    categoria           text,
    imagen_portada      text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 concat(e.simbolo_moneda, ' ', p.precio_compra) as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada
  from productos as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE
    ORDER BY p.nombre ASC
    LIMIT 10;
$function$;

GRANT EXECUTE ON FUNCTION public.buscarproductos(integer, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

DROP FUNCTION IF EXISTS public.buscarproductoslectora(integer, text);

CREATE FUNCTION public.buscarproductoslectora (
  _id_empresa integer,
  buscador    text
)
  RETURNS TABLE (
    id                  integer,
    nombre              text,
    precio_venta        numeric,
    precio_compra       numeric,
    id_categoria        integer,
    sevende_por         text,
    codigo_barras       text,
    codigo_interno      text,
    id_empresa          integer,
    maneja_inventarios  boolean,
    maneja_multiprecios boolean,
    p_venta             text,
    p_compra            text,
    categoria           text,
    imagen_portada      text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre, p.precio_venta, p.precio_compra, p.id_categoria, p.sevende_por,
 p.codigo_barras, p.codigo_interno, p.id_empresa, p.maneja_inventarios,
 p.maneja_multiprecios,
 concat(e.simbolo_moneda, ' ', p.precio_venta) as p_venta,
 concat(e.simbolo_moneda, ' ', p.precio_compra) as p_compra,
 c.nombre as categoria,
 (select pi.url from producto_imagenes pi
   where pi.id_producto = p.id order by pi.orden asc limit 1) as imagen_portada
  from productos as p inner join empresa as e on e.id = p.id_empresa
  inner join categorias as c on c.id = p.id_categoria
  where
    ( LOWER(p.codigo_barras) = LOWER(buscador)
    OR LOWER(p.codigo_interno) = LOWER(buscador))
    AND p.id_empresa = _id_empresa
    AND p.activo
    AND p.es_joyeria IS NOT TRUE;
$function$;

GRANT EXECUTE ON FUNCTION public.buscarproductoslectora(integer, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
