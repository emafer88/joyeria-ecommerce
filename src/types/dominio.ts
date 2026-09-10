// Tipos "de UI", derivados de las filas ya aplanadas que devuelven las RPC
// `ecommerce_*` (ver supabase/migrations/20260903200000_ecommerce_catalogo_rpc.sql).
// A propósito no se acoplan 1:1 a `Database['public']['Tables']`: esas son
// las tablas crudas del POS, estas son la forma que necesita el catálogo.

export interface CategoriaCatalogo {
  id: number;
  nombre: string;
  icono: string | null;
  color: string | null;
}

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precioVenta: number;
  idCategoria: number;
  categoria: string;
  esJoyeria: boolean;
  imagenPortada: string | null;
  /** null = producto sin control de stock (se interpreta como siempre disponible). */
  totalDisponible: number | null;
  /** Si aparece en la vitrina "Productos destacados" del home (admin: proyecto-joyeria). */
  destacado: boolean;
  /** Precio de oferta vigente ahora mismo, o null si no hay oferta activa. */
  precioOferta: number | null;
}

/** Banner del hero del home (admin: proyecto-joyeria → Productos → Banners). */
export interface Banner {
  id: number;
  titulo: string;
  subtitulo: string | null;
  imagenUrl: string;
  linkDestino: string | null;
}

export interface ProductoDetalle {
  id: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  categoria: string;
  esJoyeria: boolean;
  precioVenta: number;
}

export interface ImagenProducto {
  id: number;
  url: string;
  orden: number;
}

export interface VarianteDisponible {
  idVariante: number;
  material: string;
  pureza: string | null;
  precioVentaSugerido: number | null;
  imagenPortada: string | null;
  piezasDisponibles: number;
}

export interface PiezaDisponible {
  idPieza: number;
  sku: string;
  peso: number;
  precioVenta: number;
}

/** Filtros del catálogo, atados 1:1 a los parámetros de `ecommerce_listar_productos`. */
export interface FiltrosCatalogo {
  idCategoria: number | null;
  material: string | null;
  precioMin: number | null;
  precioMax: number | null;
  buscador: string | null;
  pagina: number;
  tamPagina: number;
}

export interface PaginaProductos {
  items: ProductoCatalogo[];
  totalCount: number;
}

// ----------------------------------------------------------------------------
// Carrito (Fase 2). Unión discriminada por `tipo`:
//   - "pieza": joyería serializada (piezas_inventario). Es una pieza física
//     única, así que la cantidad es siempre 1 y no se puede repetir.
//   - "stock": producto normal por cantidad. Se puede incrementar cantidad.
// El total real (precio + disponibilidad) se revalida server-side recién en
// el checkout (Fase 3) — este carrito es solo para la UX, no es autoritativo.
// ----------------------------------------------------------------------------

export interface CarritoItemPieza {
  tipo: "pieza";
  idPieza: number;
  idProducto: number;
  idVariante: number;
  nombre: string;
  material: string;
  pureza: string | null;
  precioVenta: number;
  imagen: string | null;
}

export interface CarritoItemStock {
  tipo: "stock";
  idProducto: number;
  nombre: string;
  precioVenta: number;
  cantidad: number;
  imagen: string | null;
}

export type CarritoItem = CarritoItemPieza | CarritoItemStock;

/** Clave única de un item del carrito (para agregar/quitar/actualizar). */
export function claveCarritoItem(item: CarritoItem): string {
  return item.tipo === "pieza" ? `pieza:${item.idPieza}` : `stock:${item.idProducto}`;
}

// ----------------------------------------------------------------------------
// Cuenta del comprador (Supabase Auth). Fila aplanada de `ecommerce_mis_pedidos`.
// El detalle de cada pedido sigue saliendo de la Edge Function estado-pedido
// (ver EstadoPedido en supabaseCrud/crudCheckout.ts).
// ----------------------------------------------------------------------------

export interface PedidoResumen {
  idOrdenExterna: string;
  fecha: string;
  estado: string;
  montoTotal: number;
  nroComprobante: string | null;
  cantidadProductos: number;
}

// ----------------------------------------------------------------------------
// Direcciones de envío (México). El CP ancla estado + municipio + colonia
// (ver ecommerce_buscar_cp). `lat`/`lng` vienen del pin del mapa y pueden
// faltar. `EnvioSnapshot` es la copia inmutable que queda pegada al pedido.
// ----------------------------------------------------------------------------

/** Campos editables de una dirección (form de alta/edición). */
export interface DireccionInput {
  etiqueta: string | null;
  destinatario: string;
  telefono: string;
  cp: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  entreCalles: string | null;
  referencias: string | null;
  lat: number | null;
  lng: number | null;
}

/** Dirección guardada del usuario (fila de `ecommerce_direccion`). */
export interface Direccion extends DireccionInput {
  id: number;
  esPredeterminada: boolean;
}

/** Copia de la dirección elegida al momento de comprar (la devuelve
 *  `estado-pedido`). Sin `id` ni `etiqueta`: es un snapshot, no la libreta. */
export interface EnvioSnapshot {
  destinatario: string;
  telefono: string;
  cp: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  entreCalles: string | null;
  referencias: string | null;
  lat: number | null;
  lng: number | null;
}

/** Resultado de `ecommerce_buscar_cp`, agrupado para el form. */
export interface ResultadoCodigoPostal {
  estado: string;
  municipio: string;
  ciudad: string | null;
  colonias: string[];
}
