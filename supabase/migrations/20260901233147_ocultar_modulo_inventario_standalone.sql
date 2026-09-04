-- La pantalla independiente "Inventario" (/inventario) se eliminó del sidebar:
-- su contenido ahora vive como sub-pestaña dentro de Configuración > Productos.
-- El módulo id 23 ("Inventarios", link '/inventario') queda huérfano en el
-- frontend, pero no se borra porque hay filas de `permisos` que lo referencian
-- (idmodulo = 23). En su lugar se retaguea a '#default', que es la etiqueta
-- que MostrarModulos() excluye (`neq("etiquetas","#default")`), así deja de
-- listarse como opción togglable en la pantalla de permisos de usuarios.
update public.modulos
set etiquetas = '#default'
where link = '/inventario'
  and etiquetas = '#operacion';
