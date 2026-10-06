// Estado de la licencia del sistema: plan contratado y si la cuenta está
// suspendida. Lo cambia solo el dueño del sistema (tabla `licencia`).
import { supabase } from "./supabase.config";

export interface EstadoLicencia {
  plan: "basico" | "tienda" | "completo";
  suspendida: boolean;
  mensaje: string | null;
}

export async function MostrarEstadoLicencia(): Promise<EstadoLicencia> {
  // licencia_estado todavía no está en database.types.ts.
  const { data, error } = await supabase.rpc("licencia_estado" as never);
  if (error) throw new Error(error.message);
  return data as unknown as EstadoLicencia;
}
