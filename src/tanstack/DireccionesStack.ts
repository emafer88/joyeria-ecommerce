// Hooks de TanStack Query para la libreta de direcciones. Mismo patrón que
// CatalogoStack / CheckoutStack: query-keys como constantes, los hooks solo
// orquestan cache/fetch y llaman a crudDirecciones.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BuscarCodigoPostal,
  CrearDireccion,
  EditarDireccion,
  EliminarDireccion,
  MarcarPredeterminada,
  MostrarDirecciones,
} from "../supabaseCrud/crudDirecciones";
import type { DireccionInput } from "../types/dominio";

export const K_DIRECCIONES = "ecommerce direcciones";
export const K_CP = "ecommerce codigo postal";

export const useDireccionesQuery = (habilitado: boolean) =>
  useQuery({
    queryKey: [K_DIRECCIONES],
    queryFn: MostrarDirecciones,
    enabled: habilitado,
  });

/** Lookup de CP: solo dispara con 5 dígitos exactos. */
export const useCodigoPostalQuery = (cp: string) =>
  useQuery({
    queryKey: [K_CP, cp],
    queryFn: () => BuscarCodigoPostal(cp),
    enabled: /^\d{5}$/.test(cp),
    staleTime: 60 * 60 * 1000,
  });

export const useCrearDireccionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      hacerPredeterminada,
    }: {
      input: DireccionInput;
      hacerPredeterminada?: boolean;
    }) => CrearDireccion(input, hacerPredeterminada),
    onSuccess: () => qc.invalidateQueries({ queryKey: [K_DIRECCIONES] }),
  });
};

export const useEditarDireccionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: DireccionInput }) =>
      EditarDireccion(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [K_DIRECCIONES] }),
  });
};

export const useEliminarDireccionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => EliminarDireccion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [K_DIRECCIONES] }),
  });
};

export const useMarcarPredeterminadaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => MarcarPredeterminada(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [K_DIRECCIONES] }),
  });
};
