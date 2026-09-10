// Acceso a datos de la cuenta del comprador. Mismo criterio que el resto de
// `supabaseCrud/`: funciones puras, sin React ni stores.
//
// El registro y el login son lo mismo con OAuth: `signInWithOAuth` crea el
// usuario en `auth.users` la primera vez y en las siguientes solo lo loguea.
import { supabase } from "./supabase.config";
import type { PedidoResumen } from "../types/dominio";

/**
 * Redirige a Google. Al volver, se cae en `/acceso?redirect=<destino>` y
 * supabase-js canjea el code; AuthStore ve la sesión y `Acceso` navega a
 * `destino`. `destino` debe estar en la allow-list de redirects del proyecto.
 */
export async function IniciarConGoogle(destino: string): Promise<void> {
  const redirectTo = `${window.location.origin}/acceso?redirect=${encodeURIComponent(
    destino
  )}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function CerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function MostrarMisPedidos(): Promise<PedidoResumen[]> {
  const { data, error } = await supabase.rpc("ecommerce_mis_pedidos");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    idOrdenExterna: p.id_orden_externa,
    fecha: p.fecha,
    estado: p.estado,
    montoTotal: p.monto_total,
    nroComprobante: p.nro_comprobante,
    cantidadProductos: p.cantidad_productos,
  }));
}
