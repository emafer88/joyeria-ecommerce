import { useMemo } from "react";
import { useBannersQuery, useProductosQuery } from "../tanstack/CatalogoStack";
import { BannerHero } from "../components/organismos/BannerHero";
import { SeccionCategorias } from "../components/organismos/SeccionCategorias";
import { VitrinaProductos } from "../components/organismos/VitrinaProductos";
import { BannerPromo } from "../components/organismos/BannerPromo";
import { SeccionBeneficios } from "../components/organismos/SeccionBeneficios";
import { SeccionRedesSociales } from "../components/organismos/SeccionRedesSociales";
import type { FiltrosCatalogo } from "../types/dominio";

// Trae un lote grande sin filtrar: de ahí salen "nuevos" (mayor id = alta
// más reciente), "en oferta" (precio_oferta ya viene resuelto por vigencia
// desde la RPC) y "destacados" (flag real, cargado desde el admin en
// proyecto-joyeria). Si todavía no se marcó ningún producto como destacado,
// se cae a una selección del resto que rota por día, para no dejar esa
// sección vacía el primer día.
const FILTROS_VITRINA: FiltrosCatalogo = {
  idCategoria: null,
  material: null,
  idEtiqueta: null,
  precioMin: null,
  precioMax: null,
  buscador: null,
  pagina: 1,
  tamPagina: 40,
};

const CANTIDAD_POR_SECCION = 8;

export function Inicio() {
  const { data: banners } = useBannersQuery();
  const { data, isLoading } = useProductosQuery(FILTROS_VITRINA);
  const productos = useMemo(() => data?.items ?? [], [data]);

  const nuevos = useMemo(
    () =>
      [...productos]
        .sort((a, b) => b.id - a.id)
        .slice(0, CANTIDAD_POR_SECCION),
    [productos]
  );

  const enOferta = useMemo(
    () => productos.filter((p) => p.precioOferta !== null),
    [productos]
  );

  const destacadosReales = useMemo(
    () => productos.filter((p) => p.destacado),
    [productos]
  );

  const destacados = useMemo(() => {
    if (destacadosReales.length > 0) {
      return destacadosReales.slice(0, CANTIDAD_POR_SECCION);
    }
    // Respaldo mientras no haya destacados marcados: rota por día, sin
    // repetir lo que ya se muestra en "Nuevos".
    const idsNuevos = new Set(nuevos.map((p) => p.id));
    const resto = productos.filter((p) => !idsNuevos.has(p.id));
    const semilla = new Date().getDate();
    return [...resto]
      .sort((a, b) => ((a.id + semilla) % 97) - ((b.id + semilla) % 97))
      .slice(0, CANTIDAD_POR_SECCION);
  }, [productos, nuevos, destacadosReales]);

  return (
    <>
      <BannerHero banners={banners} />
      <SeccionCategorias />
      <VitrinaProductos
        titulo="Productos destacados"
        subtitulo="Una selección de nuestras piezas favoritas"
        productos={destacados}
        cargando={isLoading}
      />
      {enOferta.length > 0 ? (
        <VitrinaProductos
          titulo="Ofertas"
          subtitulo="Precio especial por tiempo limitado"
          productos={enOferta}
          cargando={isLoading}
        />
      ) : (
        <BannerPromo />
      )}
      <VitrinaProductos
        titulo="Nuevos productos"
        subtitulo="Lo último que llegó a la joyería"
        productos={nuevos}
        cargando={isLoading}
      />
      <SeccionBeneficios />
      <SeccionRedesSociales />
    </>
  );
}
