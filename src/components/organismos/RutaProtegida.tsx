import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/AuthStore";

// Envuelve una ruta que exige sesión. Si no hay, manda a /acceso con el
// destino en `redirect` para volver acá después de loguearse.
export function RutaProtegida({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const cargando = useAuthStore((s) => s.cargando);
  const location = useLocation();

  // Todavía no sabemos si hay sesión: no renderizamos ni redirigimos para no
  // patear al usuario a /acceso y traerlo de vuelta.
  if (cargando) return null;

  if (!session) {
    const destino = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/acceso?redirect=${encodeURIComponent(destino)}`} replace />
    );
  }

  return <>{children}</>;
}
