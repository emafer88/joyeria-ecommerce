// Funciones puras de acceso a datos del catálogo público. No conocen React,
// Zustand ni TanStack Query — eso vive en `src/tanstack/CatalogoStack.ts`.
// Mismo patrón que `crudJoyeria.jsx` del proyecto POS original.
import { supabase } from "./supabase.config";
import type {
  Banner,
  CategoriaCatalogo,
  FiltrosCatalogo,
  ImagenProducto,
  PaginaProductos,
  PiezaDisponible,
  ProductoCatalogo,
  ProductoDetalle,
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

export async function MostrarProductos(
  filtros: FiltrosCatalogo
): Promise<PaginaProductos> {
  const { data, error } = await supabase.rpc("ecommerce_listar_productos", {
    _id_categoria: filtros.idCategoria ?? undefined,
    _material: filtros.material ?? undefined,
    _precio_min: filtros.precioMin ?? undefined,
    _precio_max: filtros.precioMax ?? undefined,
    _buscador: filtros.buscador ?? undefined,
    _pagina: filtros.pagina,
    _tam_pagina: filtros.tamPagina,
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
  }));

  return { items, totalCount: filas[0]?.total_count ?? 0 };
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
  }));
}
