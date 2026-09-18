import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActualizarMiTelefono,
  MostrarMiPerfil,
} from "../supabaseCrud/crudPerfil";

export const K_MI_PERFIL = "ecommerce mi perfil";

export const useMiPerfilQuery = (habilitado: boolean) =>
  useQuery({
    queryKey: [K_MI_PERFIL],
    queryFn: MostrarMiPerfil,
    enabled: habilitado,
  });

export const useActualizarTelefonoMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (telefono: string) => ActualizarMiTelefono(telefono),
    onSuccess: () => qc.invalidateQueries({ queryKey: [K_MI_PERFIL] }),
  });
};
