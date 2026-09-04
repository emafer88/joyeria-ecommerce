-- Soft delete de productos: eliminar un producto con ventas registradas
-- violaba la FK public_detalle_venta_id_producto_fkey (el borrado físico
-- rompía el historial de ventas). Ahora "eliminar" desactiva el producto
-- en vez de borrarlo: se agrega la columna `activo` y se filtra en las
-- funciones que listan/buscan productos para vender o para el catálogo.
-- Las funciones de reportes (ventas históricas) NO se tocan: deben seguir
-- mostrando productos aunque ya estén desactivados.

alter table public.productos
  add column if not exists activo boolean not null default true;

-- Catálogo (Configuración > Productos)
CREATE OR REPLACE FUNCTION public.mostrarproductos (
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
    categoria           text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre,p.precio_venta,p.precio_compra,p.id_categoria,p.sevende_por,p.codigo_barras,p.codigo_interno,p.id_empresa,p.maneja_inventarios,p.maneja_multiprecios,concat(e.simbolo_moneda,' ', p.precio_venta) as p_venta,concat(e.simbolo_moneda,' ', p.precio_compra) as p_compra,c.nombre as categoria
  from productos as p inner join empresa as e on e.id=p.id_empresa
  inner join categorias as c on c.id=p.id_categoria
  where p.id_empresa=_id_empresa and p.activo;
$function$;

-- Buscador de productos (POS, inventario, etc.)
CREATE OR REPLACE FUNCTION public.buscarproductos (
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
    categoria           text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre,p.precio_venta,p.precio_compra,p.id_categoria,p.sevende_por,p.codigo_barras,p.codigo_interno,p.id_empresa,p.maneja_inventarios,p.maneja_multiprecios,concat(e.simbolo_moneda,' ', p.precio_venta) as p_venta,concat(e.simbolo_moneda,' ', p.precio_compra) as p_compra,c.nombre as categoria
  from productos as p inner join empresa as e on e.id=p.id_empresa
  inner join categorias as c on c.id=p.id_categoria
  where (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND p.activo
    ORDER BY p.nombre ASC
    LIMIT 10;
$function$;

-- Búsqueda exacta por lectora de código de barras (no se usa aún en el
-- frontend, pero se mantiene consistente).
CREATE OR REPLACE FUNCTION public.buscarproductoslectora (
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
    categoria           text
  )
  LANGUAGE sql
  AS $function$
select p.id,
 p.nombre,p.precio_venta,p.precio_compra,p.id_categoria,p.sevende_por,p.codigo_barras,p.codigo_interno,p.id_empresa,p.maneja_inventarios,p.maneja_multiprecios,concat(e.simbolo_moneda,' ', p.precio_venta) as p_venta,concat(e.simbolo_moneda,' ', p.precio_compra) as p_compra,c.nombre as categoria
  from productos as p inner join empresa as e on e.id=p.id_empresa
  inner join categorias as c on c.id=p.id_categoria
  where
    ( LOWER(p.codigo_barras) = LOWER(buscador)
    OR LOWER(p.codigo_interno) = LOWER(buscador))
    AND p.id_empresa = _id_empresa
    AND p.activo;
$function$;

-- Alta: los chequeos de nombre/código duplicado ahora ignoran productos ya
-- desactivados, para poder reutilizar nombre/código de barras de un producto
-- "eliminado". De paso se corrige un bug de precedencia de operadores:
-- `codigo_interno=_codigo_interno or codigo_barras=_codigo_barras and id_empresa=_id_empresa`
-- evaluaba como `codigo_interno=_codigo_interno OR (codigo_barras=... AND id_empresa=...)`,
-- es decir el chequeo de codigo_interno no estaba filtrando por empresa.
CREATE OR REPLACE FUNCTION public.insertarproductos (
  _nombre              text,
  _precio_venta        numeric,
  _precio_compra       numeric,
  _id_categoria        integer,
  _codigo_barras       text,
  _codigo_interno      text,
  _id_empresa          integer,
  _sevende_por         text,
  _maneja_inventarios  boolean,
  _maneja_multiprecios boolean
)
  RETURNS integer
  LANGUAGE plpgsql
  AS $function$
declare nuevo_id int;
begin
 perform 1 from productos where nombre=_nombre and id_empresa=_id_empresa and activo;
 if found then
   raise exception 'Nombre de producto duplicado';
 else
    perform 1 from productos where (codigo_interno=_codigo_interno or codigo_barras=_codigo_barras)
     and id_empresa=_id_empresa and activo;
    if found then
     raise exception 'Codigo de barra ó interno duplicado';
    else
     insert into productos(nombre,precio_venta,precio_compra,id_categoria,codigo_barras,codigo_interno,id_empresa,sevende_por,maneja_inventarios,maneja_multiprecios)
     values(_nombre,_precio_venta,_precio_compra,_id_categoria,_codigo_barras,_codigo_interno,_id_empresa,_sevende_por,_maneja_inventarios,_maneja_multiprecios)
     returning id into nuevo_id;
     return nuevo_id;
     end if;
  end if;
end;
$function$;

-- Edición: mismo criterio, ignorar desactivados en los chequeos de duplicado.
CREATE OR REPLACE FUNCTION public.editarproductos (
  _id                 integer,
  _nombre             text,
  _precio_venta       numeric,
  _precio_compra      numeric,
  _id_categoria       integer,
  _codigo_barras      text,
  _codigo_interno     text,
  _id_empresa         integer,
  _sevende_por        text,
  _maneja_inventarios boolean
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
 perform 1 from productos where nombre=_nombre and id_empresa=_id_empresa and id!=_id and activo;
 if found then
   raise exception 'Nombre de producto duplicado';
 else
    perform 1 from productos where ((codigo_interno=_codigo_interno and id_empresa=_id_empresa and id!=_id) or
    (codigo_barras=_codigo_barras and id_empresa=_id_empresa and id!=_id)) and activo;
    if found then
     raise exception 'Codigo de barra ó interno duplicado';
    else
     update  productos set nombre=_nombre,precio_venta=_precio_venta,precio_compra=_precio_compra,id_categoria=_id_categoria,codigo_barras=_codigo_barras,codigo_interno=_codigo_interno,sevende_por=_sevende_por,maneja_inventarios=_maneja_inventarios
     where id=_id;
     end if;
  end if;
end;
$function$;
