// Estado de sesión del comprador (Supabase Auth). A diferencia de
// CarritoStore, NO persiste nada a mano: supabase-js ya guarda la sesión en
// localStorage y la refresca sola. Este store solo espeja esa sesión para
// que los componentes reaccionen (Header, rutas protegidas, "mis pedidos").
//
// La suscripción vive a nivel de módulo: se engancha una sola vez cuando la
// app importa el store (lo hace el Header), y no se desengancha nunca —
// dura lo que la pestaña.
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabaseCrud/supabase.config";

interface AuthState {
  session: Session | null;
  user: User | null;
  /** true hasta que se resuelve la sesión inicial (evita parpadeos de UI). */
  cargando: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  cargando: true,
}));

function aplicarSesion(session: Session | null) {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    cargando: false,
  });
}

supabase.auth.getSession().then(({ data }) => aplicarSesion(data.session));

// Login, logout y refresh de token. Al volver del redirect de Google,
// supabase-js canjea el code de la URL solo (detectSessionInUrl) y dispara
// acá el evento SIGNED_IN.
supabase.auth.onAuthStateChange((_evento, session) => aplicarSesion(session));

/** Nombre para mostrar: el de Google si vino, si no el email. */
export function nombreVisible(user: User | null): string {
  if (!user) return "Mi cuenta";
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email ??
    "Mi cuenta"
  );
}
