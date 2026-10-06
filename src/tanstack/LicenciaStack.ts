import { useQuery } from "@tanstack/react-query";
import { MostrarEstadoLicencia } from "../supabaseCrud/crudLicencia";

export const K_LICENCIA = "ecommerce licencia";

// La tienda solo abre si el plan la incluye y la cuenta no está suspendida.
export const useTiendaDisponibleQuery = () => {
  const query = useQuery({
    queryKey: [K_LICENCIA],
    queryFn: MostrarEstadoLicencia,
    staleTime: 5 * 60 * 1000,
  });
  const estado = query.data;
  const disponible =
    !estado || (!estado.suspendida && estado.plan !== "basico");
  return { ...query, disponible };
};
