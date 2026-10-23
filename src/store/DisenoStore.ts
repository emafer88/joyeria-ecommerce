// Zustand: borrador del diseño que manda el editor del admin cuando la tienda
// está abierta como vista previa (iframe). Mientras haya borrador se muestra
// ese en lugar del guardado; nunca se persiste.
import { create } from "zustand";
import type { DisenoTienda } from "../data/disenoTienda";

interface DisenoState {
  borrador: DisenoTienda | null;
  setBorrador: (d: DisenoTienda | null) => void;
}

export const useDisenoStore = create<DisenoState>((set) => ({
  borrador: null,
  setBorrador: (borrador) => set({ borrador }),
}));
