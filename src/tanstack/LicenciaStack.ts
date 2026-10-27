import { useQuery } from "@tanstack/react-query";
import { MostrarEstadoLicencia } from "../supabaseCrud/crudLicencia";

export const K_LICENCIA = "ecommerce licencia";

const useLicenciaQuery = () =>
  useQuery({
    queryKey: [K_LICENCIA],
    queryFn: MostrarEstadoLicencia,
    staleTime: 5 * 60 * 1000,
  });

// La tienda solo abre si el plan la incluye y la cuenta no está suspendida.
export const useTiendaDisponibleQuery = () => {
  const query = useLicenciaQuery();
  const estado = query.data;
  const disponible =
    !estado || (!estado.suspendida && estado.plan !== "basico");
  return { ...query, disponible };
};

// Funciones del ramo que trae cada giro. Misma tabla que FUNCIONES_POR_GIRO
// en src/hooks/useLicencia.jsx del admin (proyecto-joyeria).
const FUNCIONES_POR_GIRO: Record<string, string[]> = {
  joyeria: ["piezas", "granel", "apartados", "tallas"],
  ropa: ["apartados", "tallas"],
  abarrotes: ["granel"],
  generico: ["apartados"],
};

// tiene("piezas" | "tallas" | ...): la trae el giro y el negocio no la apagó.
// Mientras carga, nada.
export const useFuncionesGiro = () => {
  const { data } = useLicenciaQuery();
  const tiene = (funcion: string) =>
    !!data &&
    !!FUNCIONES_POR_GIRO[data.giro]?.includes(funcion) &&
    !data.apagadas?.includes(funcion);
  return { tiene };
};
