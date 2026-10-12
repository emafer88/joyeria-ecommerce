// Estado de la licencia del sistema: plan contratado y si la cuenta está
// suspendida. Lo cambia solo el dueño del sistema (tabla `licencia`).
import { supabase } from "./supabase.config";

export interface EstadoLicencia {
  plan: "basico" | "tienda" | "completo";
  suspendida: boolean;
  mensaje: string | null;
}

export async function MostrarEstadoLicencia(): Promise<EstadoLicencia> {
  const { data, error } = await supabase.rpc("licencia_estado");
  if (error) throw new Error(error.message);
  return data as unknown as EstadoLicencia;
}
