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
