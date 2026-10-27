// Los filtros del catálogo viven en la URL (?cat=1,2&oferta=1&orden=nuevos):
// el link filtrado se puede compartir y el botón "atrás" deshace un filtro.
import { useSearchParams } from "react-router-dom";
import type { FiltrosTienda, OrdenCatalogo } from "../types/dominio";

const ORDENES: OrdenCatalogo[] = [
  "destacados",
  "nuevos",
  "precio_asc",
  "precio_desc",
  "vendidos",
];

const ids = (v: string | null) =>
  v ? v.split(",").map(Number).filter((n) => Number.isFinite(n)) : [];
const textos = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const numero = (v: string | null) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function leerFiltros(p: URLSearchParams): FiltrosTienda {
  const orden = p.get("orden") as OrdenCatalogo | null;
  return {
    categorias: ids(p.get("cat")),
    marcas: ids(p.get("marca")),
    etiquetas: ids(p.get("etq")),
    materiales: textos(p.get("mat")),
    buscador: p.get("q") || null,
    talla: p.get("talla") || null,
    precioMin: numero(p.get("pmin")),
    precioMax: numero(p.get("pmax")),
    pesoMin: numero(p.get("gmin")),
    pesoMax: numero(p.get("gmax")),
    soloDisponibles: p.get("disp") === "1",
    enOferta: p.get("oferta") === "1",
    orden: orden && ORDENES.includes(orden) ? orden : "destacados",
    pagina: Math.max(1, numero(p.get("p")) ?? 1),
  };
}

/** Query string de unos filtros (solo lo que no está en su valor por defecto). */
export function urlFiltros(f: Partial<FiltrosTienda>): string {
  const p = new URLSearchParams();
  const lista = (clave: string, v?: (string | number)[]) => {
    if (v && v.length) p.set(clave, v.join(","));
  };
  const valor = (clave: string, v?: string | number | null) => {
    if (v !== null && v !== undefined && v !== "") p.set(clave, String(v));
  };
  lista("cat", f.categorias);
  lista("marca", f.marcas);
  lista("etq", f.etiquetas);
  lista("mat", f.materiales);
  valor("q", f.buscador);
  valor("talla", f.talla);
  valor("pmin", f.precioMin);
  valor("pmax", f.precioMax);
  valor("gmin", f.pesoMin);
  valor("gmax", f.pesoMax);
  if (f.soloDisponibles) p.set("disp", "1");
  if (f.enOferta) p.set("oferta", "1");
  if (f.orden && f.orden !== "destacados") p.set("orden", f.orden);
  if (f.pagina && f.pagina > 1) p.set("p", String(f.pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Cuántos filtros hay activos (sin contar búsqueda, orden ni página). */
export function contarFiltros(f: FiltrosTienda): number {
  return (
    f.categorias.length +
    f.marcas.length +
    f.etiquetas.length +
    f.materiales.length +
    (f.precioMin !== null || f.precioMax !== null ? 1 : 0) +
    (f.pesoMin !== null || f.pesoMax !== null ? 1 : 0) +
    (f.talla ? 1 : 0) +
    (f.soloDisponibles ? 1 : 0) +
    (f.enOferta ? 1 : 0)
  );
}

export function useFiltrosUrl() {
  const [params, setParams] = useSearchParams();
  const filtros = leerFiltros(params);

  // Cualquier cambio de filtro regresa a la página 1; cambiar de página no.
  const cambiar = (cambios: Partial<FiltrosTienda>, reemplazar = false) => {
    const nuevos = { ...filtros, pagina: 1, ...cambios };
    setParams(new URLSearchParams(urlFiltros(nuevos)), { replace: reemplazar });
  };

  // Marca o desmarca una opción de un filtro de varias opciones.
  const alternar = <K extends "categorias" | "marcas" | "etiquetas" | "materiales">(
    clave: K,
    valor: FiltrosTienda[K][number]
  ) => {
    const actual = filtros[clave] as (string | number)[];
    cambiar({
      [clave]: actual.includes(valor)
        ? actual.filter((x) => x !== valor)
        : [...actual, valor],
    } as Partial<FiltrosTienda>);
  };

  // Conserva búsqueda y orden; quita todo lo demás.
  const limpiar = () =>
    setParams(
      new URLSearchParams(
        urlFiltros({ buscador: filtros.buscador, orden: filtros.orden })
      )
    );

  return { filtros, cambiar, alternar, limpiar };
}
