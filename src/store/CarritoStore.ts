// Zustand + persist -> localStorage. Es estado de UI, no autoritativo: el
// precio/disponibilidad real se revalida server-side en el checkout (Fase 3).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  claveCarritoItem,
  type CarritoItem,
  type CarritoItemPieza,
  type CarritoItemStock,
} from "../types/dominio";

interface CarritoState {
  items: CarritoItem[];
  agregarPieza: (item: Omit<CarritoItemPieza, "tipo">) => void;
  agregarProducto: (
    item: Omit<CarritoItemStock, "tipo" | "cantidad">,
    cantidad?: number
  ) => void;
  actualizarCantidad: (idProducto: number, cantidad: number) => void;
  quitarItem: (clave: string) => void;
  vaciar: () => void;
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],

      // Una pieza serializada es única: si ya está en el carrito, no se
      // duplica (no tiene sentido "cantidad 2" de la misma pieza física).
      agregarPieza: (item) => {
        const nuevo: CarritoItemPieza = { ...item, tipo: "pieza" };
        const clave = claveCarritoItem(nuevo);
        if (get().items.some((i) => claveCarritoItem(i) === clave)) return;
        set((s) => ({ items: [...s.items, nuevo] }));
      },

      // Producto normal: si ya está en el carrito, suma cantidad en vez de
      // duplicar la fila.
      agregarProducto: (item, cantidad = 1) => {
        const clave = `stock:${item.idProducto}`;
        const existente = get().items.find(
          (i) => claveCarritoItem(i) === clave
        ) as CarritoItemStock | undefined;

        if (existente) {
          set((s) => ({
            items: s.items.map((i) =>
              claveCarritoItem(i) === clave && i.tipo === "stock"
                ? { ...i, cantidad: i.cantidad + cantidad }
                : i
            ),
          }));
        } else {
          const nuevo: CarritoItemStock = { ...item, tipo: "stock", cantidad };
          set((s) => ({ items: [...s.items, nuevo] }));
        }
      },

      actualizarCantidad: (idProducto, cantidad) => {
        if (cantidad <= 0) {
          get().quitarItem(`stock:${idProducto}`);
          return;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.tipo === "stock" && i.idProducto === idProducto
              ? { ...i, cantidad }
              : i
          ),
        }));
      },

      quitarItem: (clave) =>
        set((s) => ({
          items: s.items.filter((i) => claveCarritoItem(i) !== clave),
        })),

      vaciar: () => set({ items: [] }),
    }),
    { name: "joyeria-ecommerce-carrito" }
  )
);

export const useTotalCarrito = () =>
  useCarritoStore((s) =>
    s.items.reduce(
      (acc, i) => acc + i.precioVenta * (i.tipo === "stock" ? i.cantidad : 1),
      0
    )
  );

export const useCantidadCarrito = () =>
  useCarritoStore((s) =>
    s.items.reduce((acc, i) => acc + (i.tipo === "stock" ? i.cantidad : 1), 0)
  );
