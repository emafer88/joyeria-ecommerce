import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AgregarFavorito,
  MostrarFavoritos,
  MostrarMisIdsFavoritos,
  QuitarFavorito,
} from "../supabaseCrud/crudFavoritos";

export const K_FAVORITOS = "ecommerce favoritos";
export const K_IDS_FAVORITOS = "ecommerce ids favoritos";

export const useMisIdsFavoritosQuery = (habilitado: boolean) =>
  useQuery({
    queryKey: [K_IDS_FAVORITOS],
    queryFn: MostrarMisIdsFavoritos,
    enabled: habilitado,
  });

export const useFavoritosQuery = (habilitado: boolean) =>
  useQuery({
    queryKey: [K_FAVORITOS],
    queryFn: MostrarFavoritos,
    enabled: habilitado,
  });

export const useToggleFavoritoMutation = () => {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: [K_IDS_FAVORITOS] });
    qc.invalidateQueries({ queryKey: [K_FAVORITOS] });
  };
  return useMutation({
    mutationFn: ({ idProducto, marcado }: { idProducto: number; marcado: boolean }) =>
      marcado ? QuitarFavorito(idProducto) : AgregarFavorito(idProducto),
    onSuccess: invalidar,
  });
};
