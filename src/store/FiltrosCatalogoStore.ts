// Zustand: SOLO estado de UI (qué filtros están elegidos). El fetch/caché de
// los productos que matchean esos filtros lo maneja TanStack Query
// (`useProductosQuery` en CatalogoStack.ts), nunca este store.
import { create } from "zustand";
import type { FiltrosCatalogo } from "../types/dominio";

const FILTROS_INICIALES: FiltrosCatalogo = {
  idCategoria: null,
  material: null,
  idEtiqueta: null,
  precioMin: null,
  precioMax: null,
  buscador: null,
  pagina: 1,
  tamPagina: 24,
};

interface FiltrosCatalogoState {
  filtros: FiltrosCatalogo;
  setCategoria: (idCategoria: number | null) => void;
  setMaterial: (material: string | null) => void;
  setEtiqueta: (idEtiqueta: number | null) => void;
  setRangoPrecio: (min: number | null, max: number | null) => void;
  setBuscador: (buscador: string | null) => void;
  setPagina: (pagina: number) => void;
  limpiarFiltros: () => void;
}

export const useFiltrosCatalogoStore = create<FiltrosCatalogoState>((set) => ({
  filtros: FILTROS_INICIALES,
  setCategoria: (idCategoria) =>
    set((s) => ({ filtros: { ...s.filtros, idCategoria, pagina: 1 } })),
  setMaterial: (material) =>
    set((s) => ({ filtros: { ...s.filtros, material, pagina: 1 } })),
  setEtiqueta: (idEtiqueta) =>
    set((s) => ({ filtros: { ...s.filtros, idEtiqueta, pagina: 1 } })),
  setRangoPrecio: (precioMin, precioMax) =>
    set((s) => ({ filtros: { ...s.filtros, precioMin, precioMax, pagina: 1 } })),
  setBuscador: (buscador) =>
    set((s) => ({ filtros: { ...s.filtros, buscador, pagina: 1 } })),
  setPagina: (pagina) => set((s) => ({ filtros: { ...s.filtros, pagina } })),
  limpiarFiltros: () => set({ filtros: FILTROS_INICIALES }),
}));
