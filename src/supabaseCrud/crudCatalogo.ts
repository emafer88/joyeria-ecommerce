// Funciones puras de acceso a datos del catálogo público. No conocen React,
// Zustand ni TanStack Query — eso vive en `src/tanstack/CatalogoStack.ts`.
// Mismo patrón que `crudJoyeria.jsx` del proyecto POS original.
import { supabase } from "./supabase.config";
import type {
  Banner,
  CategoriaCatalogo,
  FiltrosCatalogo,
  FiltrosTienda,
  ImagenProducto,
  OpcionFaceta,
  PaginaProductos,
  PiezaDisponible,
  ProductoCatalogo,
  ProductoDetalle,
  ResultadoCatalogo,
  VarianteDisponible,
} from "../types/dominio";

export async function MostrarCategorias(): Promise<CategoriaCatalogo[]> {
  const { data, error } = await supabase.rpc("ecommerce_listar_categorias");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono,
    color: c.color,
  }));
}

export async function MostrarCostoEnvio(): Promise<number> {
  const { data, error } = await supabase.rpc("ecommerce_costo_envio");
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function MostrarDiseno(): Promise<unknown> {
  const { data, error } = await supabase.rpc("ecommerce_diseno");
  if (error) throw new Error(error.message);
  return data ?? {};
}

export async function MostrarProductos(
  filtros: FiltrosCatalogo
): Promise<PaginaProductos> {
  const { data, error } = await supabase.rpc("ecommerce_listar_productos", {
    _id_categoria: filtros.idCategoria ?? undefined,
    _material: filtros.material ?? undefined,
    _id_etiqueta: filtros.idEtiqueta ?? undefined,
    _precio_min: filtros.precioMin ?? undefined,
    _precio_max: filtros.precioMax ?? undefined,
    _buscador: filtros.buscador ?? undefined,
    _pagina: filtros.pagina,
    _tam_pagina: filtros.tamPagina,
    _id_marca: filtros.idMarca ?? undefined,
    _peso_min: filtros.pesoMin ?? undefined,
    _peso_max: filtros.pesoMax ?? undefined,
    _talla: filtros.talla ?? undefined,
    _solo_disponibles: filtros.soloDisponibles ? true : undefined,
  });
  if (error) throw new Error(error.message);

  const filas = data ?? [];
  const items: ProductoCatalogo[] = filas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioVenta: p.precio_venta,
    idCategoria: p.id_categoria,
    categoria: p.categoria,
    esJoyeria: p.es_joyeria,
    imagenPortada: p.imagen_portada,
    totalDisponible: p.total_disponible,
    destacado: p.destacado,
    precioOferta: p.precio_oferta,
    marca: p.marca,
    etiquetas: p.etiquetas ?? [],
  }));

  return { items, totalCount: filas[0]?.total_count ?? 0 };
}

// Fila de producto tal como la devuelven ecommerce_catalogo (jsonb).
interface FilaCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  id_categoria: number;
  categoria: string;
  es_joyeria: boolean;
  imagen_portada: string | null;
  total_disponible: number | null;
  destacado: boolean;
  precio_oferta: number | null;
  marca: string | null;
  etiquetas: string[] | null;
  es_nuevo: boolean;
  mas_vendido: boolean;
}

interface RespuestaCatalogo {
  total: number;
  items: FilaCatalogo[];
  facetas: {
    categorias: OpcionFaceta[];
    marcas: OpcionFaceta[];
    etiquetas: OpcionFaceta[];
    materiales: { valor: string; nombre: string; n: number }[];
    en_oferta: number;
    precio: { min: number | null; max: number | null };
  };
}

export const TAM_PAGINA_CATALOGO = 24;

export async function BuscarCatalogo(
  filtros: FiltrosTienda
): Promise<ResultadoCatalogo> {
  const { data, error } = await supabase.rpc("ecommerce_catalogo", {
    _f: {
      categorias: filtros.categorias,
      marcas: filtros.marcas,
      etiquetas: filtros.etiquetas,
      materiales: filtros.materiales,
      buscador: filtros.buscador,
      talla: filtros.talla,
      precio_min: filtros.precioMin,
      precio_max: filtros.precioMax,
      peso_min: filtros.pesoMin,
      peso_max: filtros.pesoMax,
      solo_disponibles: filtros.soloDisponibles,
      en_oferta: filtros.enOferta,
      orden: filtros.orden,
      pagina: filtros.pagina,
      tam_pagina: TAM_PAGINA_CATALOGO,
    },
  });
  if (error) throw new Error(error.message);
  const r = data as unknown as RespuestaCatalogo;
  return {
    total: r.total,
    items: r.items.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precioVenta: p.precio_venta,
      idCategoria: p.id_categoria,
      categoria: p.categoria,
      esJoyeria: p.es_joyeria,
      imagenPortada: p.imagen_portada,
      totalDisponible: p.total_disponible,
      destacado: p.destacado,
      precioOferta: p.precio_oferta,
      marca: p.marca,
      etiquetas: p.etiquetas ?? [],
      esNuevo: p.es_nuevo,
      masVendido: p.mas_vendido,
    })),
    facetas: {
      categorias: r.facetas.categorias,
      marcas: r.facetas.marcas,
      etiquetas: r.facetas.etiquetas,
      materiales: r.facetas.materiales.map((m) => ({
        id: m.valor,
        nombre: m.nombre,
        n: m.n,
      })),
      enOferta: r.facetas.en_oferta,
      precio: r.facetas.precio,
    },
  };
}

export async function MostrarBanners(): Promise<Banner[]> {
  const { data, error } = await supabase.rpc("ecommerce_listar_banners");
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id,
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    imagenUrl: b.imagen_url,
    linkDestino: b.link_destino,
  }));
}

export async function MostrarProductoDetalle(
  idProducto: number
): Promise<ProductoDetalle | null> {
  const { data, error } = await supabase.rpc("ecommerce_producto_detalle", {
    _id_producto: idProducto,
  });
  if (error) throw new Error(error.message);
  const fila = data?.[0];
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    idCategoria: fila.id_categoria,
    categoria: fila.categoria,
    esJoyeria: fila.es_joyeria,
    precioVenta: fila.precio_venta,
    imagenPortada: fila.imagen_portada,
    totalDisponible: fila.total_disponible,
    destacado: fila.destacado,
    precioOferta: fila.precio_oferta,
    marca: fila.marca,
    medidas: fila.medidas,
    tallas: fila.tallas,
    etiquetas: fila.etiquetas ?? [],
  };
}

export async function MostrarImagenesProducto(
  idProducto: number
): Promise<ImagenProducto[]> {
  const { data, error } = await supabase.rpc("ecommerce_imagenes_producto", {
    _id_producto: idProducto,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({ id: i.id, url: i.url, orden: i.orden }));
}

export async function MostrarImagenesVariante(
  idVariante: number
): Promise<ImagenProducto[]> {
  const { data, error } = await supabase.rpc("ecommerce_imagenes_variante", {
    _id_variante: idVariante,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({ id: i.id, url: i.url, orden: i.orden }));
}

export async function MostrarVariantesDisponibles(
  idProducto: number
): Promise<VarianteDisponible[]> {
  const { data, error } = await supabase.rpc(
    "ecommerce_variantes_disponibles",
    { _id_producto: idProducto }
  );
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => ({
    idVariante: v.id_variante,
    material: v.material,
    pureza: v.pureza,
    precioVentaSugerido: v.precio_venta_sugerido,
    imagenPortada: v.imagen_portada,
    piezasDisponibles: v.piezas_disponibles,
    tallasDisponibles: v.tallas_disponibles ?? [],
  }));
}

export async function MostrarPiezasDisponibles(
  idVariante: number
): Promise<PiezaDisponible[]> {
  const { data, error } = await supabase.rpc("ecommerce_piezas_disponibles", {
    _id_variante: idVariante,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    idPieza: p.id_pieza,
    sku: p.sku,
    peso: p.peso,
    precioVenta: p.precio_venta,
    talla: p.talla,
    medidas: p.medidas,
    precioOferta: p.precio_oferta,
    idGrupo: p.id_grupo,
  }));
}
