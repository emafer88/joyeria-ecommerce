// Diseño editable de la tienda: el guardado viene de la base (RPC
// ecommerce_diseno) y, si la tienda está abierta como vista previa desde el
// admin, el borrador que llega por postMessage lo reemplaza.
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MostrarDiseno } from "../supabaseCrud/crudCatalogo";
import { normalizarDiseno, type DisenoTienda } from "../data/disenoTienda";
import { useDisenoStore } from "../store/DisenoStore";
import { useGiro } from "./LicenciaStack";
import logoJoyeria from "../assets/logo.png";

export const K_DISENO = "ecommerce diseno";

// Copia local del último diseño: evita que al abrir la tienda se vea un
// instante la paleta de fábrica antes de que responda la base.
const CACHE = "cubiks-diseno";

const leerCache = (): unknown => {
  try {
    const crudo = localStorage.getItem(CACHE);
    return crudo ? JSON.parse(crudo) : undefined;
  } catch {
    return undefined;
  }
};

export const useDisenoQuery = () =>
  useQuery({
    queryKey: [K_DISENO],
    queryFn: async () => {
      const diseno = await MostrarDiseno();
      try {
        localStorage.setItem(CACHE, JSON.stringify(diseno));
      } catch {
        // sin almacenamiento (modo privado, etc.): solo se pierde la copia
      }
      return diseno;
    },
    placeholderData: leerCache,
    staleTime: 5 * 60 * 1000,
  });

export function useDiseno(): DisenoTienda {
  const { data } = useDisenoQuery();
  const borrador = useDisenoStore((s) => s.borrador);
  const giro = useGiro();
  return useMemo(
    () => borrador ?? normalizarDiseno(data, giro),
    [borrador, data, giro]
  );
}

// Logo de la tienda: el que se subió en Diseño de la tienda → Contacto; sin
// él, una joyería conserva el diamante y los demás giros solo muestran el
// nombre. `propio` distingue el subido (cualquier forma) del diamante (va en
// un círculo).
export function useLogoTienda(): { src: string; propio: boolean } {
  const { contacto } = useDiseno();
  const giro = useGiro();
  if (contacto.logo) return { src: contacto.logo, propio: true };
  return { src: giro === "joyeria" ? logoJoyeria : "", propio: false };
}

// Título de la pestaña y favicon con el nombre y el logo de la tienda.
export function useMarcaDocumento() {
  const { contacto } = useDiseno();
  const { src } = useLogoTienda();
  useEffect(() => {
    document.title = contacto.nombre || "Tienda en línea";
  }, [contacto.nombre]);
  useEffect(() => {
    const icono = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!icono) return;
    icono.href = src || "/favicon-tienda.svg";
    icono.type = src ? "" : "image/svg+xml";
  }, [src]);
}

const ORIGENES_ADMIN = (
  import.meta.env.VITE_ADMIN_ORIGENES ??
  "https://pos.cubiks.mx,https://cubiks-pos.fer-ema-777.workers.dev,http://localhost:5173,http://localhost:5181"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Solo dentro de un iframe y solo mensajes del admin. Se avisa al admin que la
// tienda está lista para recibir el borrador (el iframe puede cargar después
// de que el editor mandó el primero).
export function useVistaPreviaDiseno() {
  const setBorrador = useDisenoStore((s) => s.setBorrador);
  const giro = useGiro();

  useEffect(() => {
    if (window.parent === window) return;

    const recibir = (e: MessageEvent) => {
      if (e.source !== window.parent || !ORIGENES_ADMIN.includes(e.origin)) return;
      if (e.data?.tipo !== "cubiks-diseno") return;
      setBorrador(normalizarDiseno(e.data.diseno, giro));
    };
    window.addEventListener("message", recibir);
    for (const origen of ORIGENES_ADMIN) {
      window.parent.postMessage({ tipo: "cubiks-diseno-listo" }, origen);
    }
    return () => window.removeEventListener("message", recibir);
  }, [setBorrador, giro]);
}
