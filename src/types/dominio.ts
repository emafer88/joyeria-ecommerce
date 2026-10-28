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
  /** Marca del producto (`productos.id_marca` → `marca.nombre`), o null. */
  marca: string | null;
  /** Etiquetas/tags del producto (nombres, ya ordenados). */
  etiquetas: string[];
  /** Dado de alta hace 30 días o menos (solo lo trae el catálogo). */
  esNuevo?: boolean;
  /** Entre los 5 más vendidos de los últimos 90 días (solo el catálogo). */
  masVendido?: boolean;
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
  imagenPortada: string | null;
  /** null = producto sin control de stock (se interpreta como siempre disponible). */
  totalDisponible: number | null;
  destacado: boolean;
  /** Precio de oferta vigente ahora mismo, o null si no hay oferta activa. */
  precioOferta: number | null;
  /** Marca del producto (`productos.id_marca` → `marca.nombre`), o null. */
  marca: string | null;
  /** Medidas/dimensiones, texto libre. */
  medidas: string | null;
  /** Tallas disponibles (texto libre) para productos no serializados. */
  tallas: string | null;
  /** Etiquetas/tags del producto (nombres, ya ordenados). */
  etiquetas: string[];
}

export interface ImagenProducto {
  id: number;
  url: string;
  orden: number;
  /** Foto de un color del producto (Negro), o null si es de todos. */
  color?: string | null;
}

/** Una talla/color de un producto con su existencia (Fase C). */
export interface CombinacionProducto {
  id: number;
  /** "" si el producto solo tiene colores. */
  talla: string;
  /** "" si el producto solo tiene tallas. */
  color: string;
  colorHex: string | null;
  orden: number;
  disponible: number;
}

export interface VarianteDisponible {
  idVariante: number;
  material: string;
  pureza: string | null;
  precioVentaSugerido: number | null;
  imagenPortada: string | null;
  piezasDisponibles: number;
  /** Tallas distintas entre las piezas disponibles de esta variante. */
  tallasDisponibles: string[];
}

export interface PiezaDisponible {
  idPieza: number;
  sku: string;
  peso: number;
  precioVenta: number;
  talla: string | null;
  /** Medidas de esta pieza física puntual (ej. "45 cm"), o null. */
  medidas: string | null;
  /** Precio con descuento de esta pieza puntual, o null si no hay oferta. */
  precioOferta: number | null;
  /** Agrupa piezas físicamente iguales (mismo peso+talla+medidas) de la variante. */
  idGrupo: number;
}

/** Filtros del catálogo, atados 1:1 a los parámetros de `ecommerce_listar_productos`. */
export interface FiltrosCatalogo {
  idCategoria: number | null;
  material: string | null;
  idEtiqueta: number | null;
  precioMin: number | null;
  precioMax: number | null;
  buscador: string | null;
  idMarca: number | null;
  pesoMin: number | null;
  pesoMax: number | null;
  talla: string | null;
  soloDisponibles: boolean;
  pagina: number;
  tamPagina: number;
}

// ----------------------------------------------------------------------------
// Catálogo con orden, filtros de varias opciones y conteos (RPC
// ecommerce_catalogo). Los filtros viven en la URL (?cat=1,2&orden=...).
// ----------------------------------------------------------------------------

export type OrdenCatalogo =
  | "destacados"
  | "nuevos"
  | "precio_asc"
  | "precio_desc"
  | "vendidos";

export interface FiltrosTienda {
  categorias: number[];
  marcas: number[];
  etiquetas: number[];
  materiales: string[];
  /** id de atributo → ids de valor elegidos (Género: Mujer, Unisex). */
  atributos: Record<string, number[]>;
  buscador: string | null;
  talla: string | null;
  /** Colores elegidos, en minúsculas (negro, azul marino). */
  colores: string[];
  precioMin: number | null;
  precioMax: number | null;
  pesoMin: number | null;
  pesoMax: number | null;
  soloDisponibles: boolean;
  enOferta: boolean;
  orden: OrdenCatalogo;
  pagina: number;
}

/** Una opción de un filtro con cuántos productos quedarían al elegirla. */
export interface OpcionFaceta<T = number> {
  id: T;
  nombre: string;
  n: number;
  /** Se muestra con sangría debajo de su padre (subcategoría). */
  hija?: boolean;
}

/** Categoría del catálogo; idPadre != null si es subcategoría. */
export interface FacetaCategoria extends OpcionFaceta {
  idPadre: number | null;
}

/** Atributo del negocio (Género, Piedra...) con sus valores como opciones. */
export interface FacetaAtributo {
  id: number;
  nombre: string;
  valores: OpcionFaceta[];
}

/** Atributos de un producto para su ficha ("Género": ["Mujer"]). */
export interface AtributoProducto {
  atributo: string;
  valores: string[];
}

export interface FacetasCatalogo {
  categorias: FacetaCategoria[];
  marcas: OpcionFaceta[];
  etiquetas: OpcionFaceta[];
  materiales: OpcionFaceta<string>[];
  atributos: FacetaAtributo[];
  /** Tallas con existencia (ropa y calzado), ya en orden XS…XXL / 22…30. */
  tallas: { valor: string; n: number }[];
  /** Colores con existencia; id = nombre en minúsculas. */
  colores: (OpcionFaceta<string> & { hex: string | null })[];
  enOferta: number;
  precio: { min: number | null; max: number | null };
}

export interface ResultadoCatalogo {
  items: ProductoCatalogo[];
  total: number;
  facetas: FacetasCatalogo;
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
  /** Talla/color elegida (ropa y calzado); sin ella, el producto a secas. */
  idCombinacion?: number | null;
  talla?: string | null;
  color?: string | null;
}

export type CarritoItem = CarritoItemPieza | CarritoItemStock;

/** Clave única de un item del carrito (para agregar/quitar/actualizar). */
export function claveCarritoItem(item: CarritoItem): string {
  if (item.tipo === "pieza") return `pieza:${item.idPieza}`;
  return item.idCombinacion
    ? `stock:${item.idProducto}:${item.idCombinacion}`
    : `stock:${item.idProducto}`;
}

/** "M · Negro" de un item con talla/color, o "" si no tiene. */
export function textoCombinacion(c: { talla?: string | null; color?: string | null }): string {
  return [c.talla, c.color].filter(Boolean).join(" · ");
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
  /** null/'preparando'/'enviado'/'entregado', solo relevante si estado === 'confirmada'. */
  estadoEnvio: string | null;
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
  /** Email de contacto del comprador (no de la dirección). */
  email: string | null;
}

/** Resultado de `ecommerce_buscar_cp`, agrupado para el form. */
export interface ResultadoCodigoPostal {
  estado: string;
  municipio: string;
  ciudad: string | null;
  colonias: string[];
}
