import { Fragment, useMemo } from "react";
import { useBannersQuery, useProductosQuery } from "../tanstack/CatalogoStack";
import { BannerHero } from "../components/organismos/BannerHero";
import { SeccionCategorias } from "../components/organismos/SeccionCategorias";
import { VitrinaProductos } from "../components/organismos/VitrinaProductos";
import { BannerPromo } from "../components/organismos/BannerPromo";
import { SeccionBeneficios } from "../components/organismos/SeccionBeneficios";
import { SeccionRedesSociales } from "../components/organismos/SeccionRedesSociales";
import type { FiltrosCatalogo } from "../types/dominio";
import type { Seccion } from "../data/disenoTienda";
import { useDiseno } from "../tanstack/DisenoStack";

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
  idMarca: null,
  pesoMin: null,
  pesoMax: null,
  talla: null,
  soloDisponibles: false,
  pagina: 1,
  tamPagina: 40,
};

const CANTIDAD_POR_SECCION = 8;

export function Inicio() {
  const diseno = useDiseno();
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

  // Orden, visibilidad y textos vienen del diseño editable (admin →
  // Diseño de la tienda).
  const render = (s: Seccion) => {
    switch (s.id) {
      case "banner":
        return <BannerHero banners={banners} />;
      case "categorias":
        return <SeccionCategorias titulo={s.titulo} />;
      case "destacados":
        return (
          <VitrinaProductos
            titulo={s.titulo}
            subtitulo={s.subtitulo}
            productos={destacados}
            cargando={isLoading}
          />
        );
      case "ofertas":
        return enOferta.length > 0 ? (
          <VitrinaProductos
            titulo={s.titulo}
            subtitulo={s.subtitulo}
            productos={enOferta}
            cargando={isLoading}
          />
        ) : (
          <BannerPromo promo={diseno.promo} />
        );
      case "nuevos":
        return (
          <VitrinaProductos
            titulo={s.titulo}
            subtitulo={s.subtitulo}
            productos={nuevos}
            cargando={isLoading}
          />
        );
      case "beneficios":
        return <SeccionBeneficios beneficios={diseno.beneficios} />;
      case "redes":
        return (
          <SeccionRedesSociales
            titulo={s.titulo}
            subtitulo={s.subtitulo}
            contacto={diseno.contacto}
          />
        );
    }
  };

  return (
    <>
      {diseno.secciones
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{render(s)}</Fragment>
        ))}
    </>
  );
}
