import { useQuery } from "@tanstack/react-query";
import { MostrarEstadoLicencia } from "../supabaseCrud/crudLicencia";

export const K_LICENCIA = "ecommerce licencia";

// Copia local del giro: el logo y los textos de fábrica dependen de él y así
// no cambian un instante después de abrir la tienda.
const CACHE_GIRO = "cubiks-giro";

const leerGiro = (): string | undefined => {
  try {
    return localStorage.getItem(CACHE_GIRO) ?? undefined;
  } catch {
    return undefined;
  }
};

const useLicenciaQuery = () =>
  useQuery({
    queryKey: [K_LICENCIA],
    queryFn: async () => {
      const estado = await MostrarEstadoLicencia();
      try {
        localStorage.setItem(CACHE_GIRO, estado.giro);
      } catch {
        // sin almacenamiento: solo se pierde la copia
      }
      return estado;
    },
    staleTime: 5 * 60 * 1000,
  });

// Giro del negocio (joyeria, ropa, ...); mientras carga, el de la última vez.
export const useGiro = (): string | undefined => {
  const { data } = useLicenciaQuery();
  return data?.giro ?? leerGiro();
};

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
