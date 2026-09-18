// Perfil del comprador: solo el teléfono es editable acá (nombre/email
// vienen de la sesión de Google). Mismo patrón que crudDirecciones.ts.
import { supabase } from "./supabase.config";

export interface MiPerfil {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
}

export async function MostrarMiPerfil(): Promise<MiPerfil | null> {
  const { data, error } = await supabase.rpc("ecommerce_mi_perfil");
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function ActualizarMiTelefono(telefono: string): Promise<void> {
  const { error } = await supabase.rpc("ecommerce_actualizar_mi_telefono", {
    _telefono: telefono,
  });
  if (error) throw new Error(error.message);
}
