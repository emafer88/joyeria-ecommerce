// Hooks de TanStack Query para el catálogo. Mismo patrón que
// `JoyeriaStack.jsx` del proyecto POS original: query-keys como constantes,
// los hooks solo orquestan cache/fetch y llaman a `crudCatalogo.ts`.
import { useQuery } from "@tanstack/react-query";
import {
  MostrarCategorias,
  MostrarImagenesProducto,
  MostrarImagenesVariante,
  MostrarPiezasDisponibles,
  MostrarProductoDetalle,
  MostrarProductos,
  MostrarVariantesDisponibles,
} from "../supabaseCrud/crudCatalogo";
import type { FiltrosCatalogo } from "../types/dominio";

export const K_CATEGORIAS = "ecommerce categorias";
export const K_PRODUCTOS = "ecommerce productos";
export const K_PRODUCTO_DETALLE = "ecommerce producto detalle";
export const K_IMAGENES_PRODUCTO = "ecommerce imagenes producto";
export const K_IMAGENES_VARIANTE = "ecommerce imagenes variante";
export const K_VARIANTES = "ecommerce variantes disponibles";
export const K_PIEZAS_VARIANTE = "ecommerce piezas disponibles";

export const useCategoriasQuery = () =>
  useQuery({
    queryKey: [K_CATEGORIAS],
    queryFn: MostrarCategorias,
    staleTime: 5 * 60 * 1000,
  });

export const useProductosQuery = (filtros: FiltrosCatalogo) =>
  useQuery({
    queryKey: [K_PRODUCTOS, filtros],
    queryFn: () => MostrarProductos(filtros),
    placeholderData: (previa) => previa,
  });

export const useProductoDetalleQuery = (idProducto: number | undefined) =>
  useQuery({
    queryKey: [K_PRODUCTO_DETALLE, idProducto],
    queryFn: () => MostrarProductoDetalle(idProducto as number),
    enabled: idProducto !== undefined,
  });

export const useImagenesProductoQuery = (idProducto: number | undefined) =>
  useQuery({
    queryKey: [K_IMAGENES_PRODUCTO, idProducto],
    queryFn: () => MostrarImagenesProducto(idProducto as number),
    enabled: idProducto !== undefined,
  });

export const useImagenesVarianteQuery = (idVariante: number | undefined) =>
  useQuery({
    queryKey: [K_IMAGENES_VARIANTE, idVariante],
    queryFn: () => MostrarImagenesVariante(idVariante as number),
    enabled: idVariante !== undefined,
  });

export const useVariantesDisponiblesQuery = (idProducto: number | undefined) =>
  useQuery({
    queryKey: [K_VARIANTES, idProducto],
    queryFn: () => MostrarVariantesDisponibles(idProducto as number),
    enabled: idProducto !== undefined,
  });

export const usePiezasDisponiblesQuery = (idVariante: number | undefined) =>
  useQuery({
    queryKey: [K_PIEZAS_VARIANTE, idVariante],
    queryFn: () => MostrarPiezasDisponibles(idVariante as number),
    enabled: idVariante !== undefined,
  });
