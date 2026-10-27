import { useEffect, useState } from "react";
import styled from "styled-components";
import { FiSliders, FiX } from "react-icons/fi";
import { useCatalogoQuery } from "../tanstack/CatalogoStack";
import { TarjetaProducto } from "../components/organismos/TarjetaProducto";
import { FiltrosCatalogo } from "../components/organismos/FiltrosCatalogo";
import { contarFiltros, useFiltrosUrl } from "../hooks/useFiltrosUrl";
import { TAM_PAGINA_CATALOGO } from "../supabaseCrud/crudCatalogo";
import type { FacetasCatalogo, FiltrosTienda, OrdenCatalogo } from "../types/dominio";
import { v } from "../styles/variables";
import { useFuncionesGiro } from "../tanstack/LicenciaStack";

const ORDENES: [OrdenCatalogo, string][] = [
  ["destacados", "Destacados"],
  ["nuevos", "Lo más nuevo"],
  ["vendidos", "Más vendidos"],
  ["precio_asc", "Precio: menor a mayor"],
  ["precio_desc", "Precio: mayor a menor"],
];

const dinero = (n: number) => `$${n.toLocaleString("es-MX")}`;

// Etiquetas de los filtros elegidos, cada una con lo que hay que cambiar
// para quitarla.
function filtrosActivos(
  f: FiltrosTienda,
  facetas: FacetasCatalogo | undefined
): { texto: string; quitar: Partial<FiltrosTienda> }[] {
  const nombre = (lista: { id: number | string; nombre: string }[] | undefined, id: number | string) =>
    lista?.find((o) => o.id === id)?.nombre ?? String(id);
  const chips: { texto: string; quitar: Partial<FiltrosTienda> }[] = [];
  f.categorias.forEach((id) =>
    chips.push({
      texto: nombre(facetas?.categorias, id),
      quitar: { categorias: f.categorias.filter((x) => x !== id) },
    })
  );
  f.materiales.forEach((m) =>
    chips.push({
      texto: nombre(facetas?.materiales, m),
      quitar: { materiales: f.materiales.filter((x) => x !== m) },
    })
  );
  Object.entries(f.atributos).forEach(([idAtributo, valores]) => {
    const atributo = facetas?.atributos.find((a) => String(a.id) === idAtributo);
    valores.forEach((idValor) =>
      chips.push({
        texto: nombre(atributo?.valores, idValor),
        quitar: {
          atributos: {
            ...f.atributos,
            [idAtributo]: valores.filter((x) => x !== idValor),
          },
        },
      })
    );
  });
  f.marcas.forEach((id) =>
    chips.push({
      texto: nombre(facetas?.marcas, id),
      quitar: { marcas: f.marcas.filter((x) => x !== id) },
    })
  );
  f.etiquetas.forEach((id) =>
    chips.push({
      texto: nombre(facetas?.etiquetas, id),
      quitar: { etiquetas: f.etiquetas.filter((x) => x !== id) },
    })
  );
  if (f.precioMin !== null || f.precioMax !== null) {
    chips.push({
      texto:
        f.precioMin !== null && f.precioMax !== null
          ? `${dinero(f.precioMin)} – ${dinero(f.precioMax)}`
          : f.precioMin !== null
            ? `Desde ${dinero(f.precioMin)}`
            : `Hasta ${dinero(f.precioMax!)}`,
      quitar: { precioMin: null, precioMax: null },
    });
  }
  if (f.pesoMin !== null || f.pesoMax !== null) {
    chips.push({
      texto: `Peso ${f.pesoMin ?? 0}–${f.pesoMax ?? "…"} g`,
      quitar: { pesoMin: null, pesoMax: null },
    });
  }
  if (f.talla) chips.push({ texto: `Talla ${f.talla}`, quitar: { talla: null } });
  if (f.enOferta) chips.push({ texto: "En oferta", quitar: { enOferta: false } });
  if (f.soloDisponibles)
    chips.push({ texto: "Solo disponibles", quitar: { soloDisponibles: false } });
  if (f.buscador)
    chips.push({ texto: `“${f.buscador}”`, quitar: { buscador: null } });
  return chips;
}

export function Catalogo() {
  const control = useFiltrosUrl();
  const { filtros, cambiar, limpiar } = control;
  const { data, isLoading, isError, error, isFetching } = useCatalogoQuery(filtros);
  const conPiezas = useFuncionesGiro().tiene("piezas");
  // En escritorio el panel se oculta/muestra; en celular es un cajón.
  const [panelVisible, setPanelVisible] = useState(true);
  const [cajonAbierto, setCajonAbierto] = useState(false);

  // Con el cajón abierto la página de atrás no se desplaza.
  useEffect(() => {
    document.body.style.overflow = cajonAbierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cajonAbierto]);

  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / TAM_PAGINA_CATALOGO));
  const activos = filtrosActivos(filtros, data?.facetas);
  const nFiltros = contarFiltros(filtros);
  const todasCategorias = data?.facetas.categorias ?? [];
  const visible = (c: { id: number; n: number }) =>
    c.n > 0 || filtros.categorias.includes(c.id);
  const categorias = todasCategorias.filter((c) => c.idPadre === null && visible(c));
  // Con una sola categoría elegida, su padre (o ella misma si es padre)
  // muestra una segunda fila con sus subcategorías.
  const elegida =
    filtros.categorias.length === 1
      ? todasCategorias.find((c) => c.id === filtros.categorias[0])
      : undefined;
  const idPadreActivo = elegida ? elegida.idPadre ?? elegida.id : null;
  const padreActivo = todasCategorias.find((c) => c.id === idPadreActivo);
  const subcategorias = todasCategorias.filter(
    (c) => c.idPadre !== null && c.idPadre === idPadreActivo && visible(c)
  );

  const irPagina = (pagina: number) => {
    cambiar({ pagina });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Container>
      <span className="etiqueta">Catálogo</span>
      <div className="encabezado">
        <h1>
          {conPiezas ? "Piezas disponibles" : "Productos disponibles"}
          {data && <span className="total"> ({total})</span>}
        </h1>
        <div className="acciones">
          <button
            type="button"
            className="boton-filtros escritorio"
            onClick={() => setPanelVisible(!panelVisible)}
          >
            {panelVisible ? "Ocultar filtros" : "Mostrar filtros"}
            <FiSliders />
          </button>
          <button
            type="button"
            className="boton-filtros celular"
            onClick={() => setCajonAbierto(true)}
          >
            Filtros{nFiltros > 0 ? ` (${nFiltros})` : ""}
            <FiSliders />
          </button>
          <label className="ordenar">
            <span>Ordenar por</span>
            <select
              value={filtros.orden}
              onChange={(e) =>
                cambiar({ orden: e.target.value as OrdenCatalogo })
              }
            >
              {ORDENES.map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {categorias.length > 1 && (
        <nav className="chips-categorias">
          <button
            type="button"
            className={filtros.categorias.length === 0 ? "on" : ""}
            onClick={() => cambiar({ categorias: [] })}
          >
            Todo
          </button>
          {categorias.map((c) => (
            <button
              type="button"
              key={c.id}
              className={idPadreActivo === c.id ? "on" : ""}
              onClick={() => cambiar({ categorias: [c.id] })}
            >
              {c.nombre}
            </button>
          ))}
        </nav>
      )}

      {padreActivo && subcategorias.length > 0 && (
        <nav className="chips-categorias sub">
          <button
            type="button"
            className={elegida?.id === padreActivo.id ? "on" : ""}
            onClick={() => cambiar({ categorias: [padreActivo.id] })}
          >
            Todo en {padreActivo.nombre}
          </button>
          {subcategorias.map((c) => (
            <button
              type="button"
              key={c.id}
              className={elegida?.id === c.id ? "on" : ""}
              onClick={() => cambiar({ categorias: [c.id] })}
            >
              {c.nombre}
            </button>
          ))}
        </nav>
      )}

      {activos.length > 0 && (
        <div className="activos">
          {activos.map((a) => (
            <button
              type="button"
              key={a.texto}
              className="chip"
              onClick={() => cambiar(a.quitar)}
              aria-label={`Quitar ${a.texto}`}
            >
              {a.texto} <FiX />
            </button>
          ))}
          <button type="button" className="limpiar" onClick={limpiar}>
            Limpiar todo
          </button>
        </div>
      )}

      <div className={`layout ${panelVisible ? "" : "sin-panel"}`}>
        <aside className={`panel ${cajonAbierto ? "abierto" : ""}`}>
          <div className="panel-cabecera">
            <strong>Filtros</strong>
            <button
              type="button"
              className="cerrar"
              onClick={() => setCajonAbierto(false)}
              aria-label="Cerrar filtros"
            >
              <FiX />
            </button>
          </div>
          <div className="panel-cuerpo">
            <FiltrosCatalogo {...control} facetas={data?.facetas} />
          </div>
          <div className="panel-pie">
            <button type="button" className="limpiar" onClick={limpiar}>
              Limpiar
            </button>
            <button
              type="button"
              className="ver"
              onClick={() => setCajonAbierto(false)}
            >
              Ver {total} producto{total === 1 ? "" : "s"}
            </button>
          </div>
        </aside>
        {cajonAbierto && (
          <div className="velo" onClick={() => setCajonAbierto(false)} />
        )}

        <div className={`resultados ${isFetching && data ? "cargando" : ""}`}>
          {isLoading && <p>Cargando productos...</p>}
          {isError && (
            <p className="error">
              No se pudo cargar el catálogo: {(error as Error).message}
            </p>
          )}
          {data && data.items.length === 0 && (
            <div className="vacio">
              <p>No hay productos que coincidan con estos filtros.</p>
              {activos.length > 0 && (
                <button type="button" className="limpiar" onClick={limpiar}>
                  Quitar filtros
                </button>
              )}
            </div>
          )}

          <div className="grilla">
            {data?.items.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>

          {total > TAM_PAGINA_CATALOGO && (
            <div className="paginacion">
              <button
                type="button"
                disabled={filtros.pagina <= 1}
                onClick={() => irPagina(filtros.pagina - 1)}
              >
                Anterior
              </button>
              <span>
                Página {filtros.pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={filtros.pagina >= totalPaginas}
                onClick={() => irPagina(filtros.pagina + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 60px;
  @media (max-width: 575.98px) {
    padding: 24px 16px 48px;
  }

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .encabezado {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 20px;
    margin: 8px 0 18px;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    .total {
      font-weight: 400;
      color: ${v.colorTextoSuave2};
    }
  }

  .acciones {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .boton-filtros,
  .ordenar select {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border-radius: 20px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTexto};
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }
  .ordenar {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${v.colorTextoSuave};
    select option {
      background: var(--c-panel);
      color: ${v.colorTexto};
    }
  }
  .boton-filtros.celular {
    display: none;
  }
  @media (max-width: 767.98px) {
    .boton-filtros.escritorio {
      display: none;
    }
    .boton-filtros.celular {
      display: inline-flex;
    }
    .ordenar span {
      display: none;
    }
  }

  .chips-categorias {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    margin-bottom: 12px;
    scrollbar-width: thin;
    button {
      flex-shrink: 0;
      padding: 7px 16px;
      border-radius: 20px;
      border: 1px solid ${v.borderSutil};
      background: transparent;
      color: ${v.colorTexto};
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: 0.2s;
      &:hover {
        border-color: ${v.borderDorado};
      }
      &.on {
        background: ${v.colorPrincipal};
        border-color: ${v.colorPrincipal};
        color: var(--c-sobre-principal, #111);
        font-weight: 600;
      }
    }
    /* Subcategorías: más chicas y con contorno en vez de relleno. */
    &.sub {
      margin-top: -4px;
      button {
        padding: 5px 13px;
        font-size: 13px;
        &.on {
          background: rgba(var(--c-principal-rgb), 0.12);
          color: ${v.colorTexto};
          border-color: ${v.colorPrincipal};
        }
      }
    }
  }

  .activos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px 6px 14px;
      border-radius: 20px;
      border: 1px solid ${v.borderDorado};
      background: rgba(var(--c-principal-rgb), 0.1);
      color: ${v.colorTexto};
      font-size: 13px;
      cursor: pointer;
    }
  }
  .limpiar {
    background: none;
    border: none;
    color: ${v.colorTextoSuave};
    text-decoration: underline;
    font-size: 13px;
    cursor: pointer;
    padding: 6px 4px;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    @media (min-width: 768px) {
      grid-template-columns: 240px minmax(0, 1fr);
      &.sin-panel {
        grid-template-columns: minmax(0, 1fr);
        .panel {
          display: none;
        }
      }
    }
  }

  .panel {
    background: ${v.bgTarjeta};
    border: 1px solid ${v.borderSutil};
    border-radius: ${v.borderRadius};
    height: fit-content;
    .panel-cabecera,
    .panel-pie {
      display: none;
    }
    .panel-cuerpo {
      padding: 20px;
    }
  }

  /* Celular: el panel es un cajón que sale de la izquierda. */
  @media (max-width: 767.98px) {
    .panel {
      position: fixed;
      inset: 0 auto 0 0;
      width: min(340px, 88vw);
      height: 100%;
      z-index: 60;
      border-radius: 0;
      background: var(--c-panel);
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      &.abierto {
        transform: none;
      }
      .panel-cabecera {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid ${v.borderSutil};
        font-size: 17px;
      }
      .panel-cuerpo {
        flex: 1;
        overflow-y: auto;
      }
      .panel-pie {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 20px;
        border-top: 1px solid ${v.borderSutil};
        .ver {
          flex: 1;
          padding: 12px;
          border-radius: 24px;
          border: none;
          background: ${v.colorPrincipal};
          color: var(--c-sobre-principal, #111);
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }
      }
      .cerrar {
        background: none;
        border: none;
        color: ${v.colorTexto};
        font-size: 22px;
        cursor: pointer;
        display: flex;
      }
    }
    .velo {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 55;
    }
  }

  .resultados.cargando {
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .vacio {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .grilla {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(2, 1fr);
    @media (min-width: 576px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (min-width: 992px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .layout.sin-panel .grilla {
    @media (min-width: 1100px) {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  .error {
    color: var(--c-error);
  }

  .paginacion {
    display: flex;
    align-items: center;
    gap: 14px;
    justify-content: center;
    margin-top: 30px;
    color: ${v.colorTextoSuave};
    font-size: 14px;
    button {
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid ${v.borderSutil};
      background: ${v.bgTarjeta};
      color: ${v.colorTexto};
      cursor: pointer;
      transition: 0.2s;
      &:hover:not(:disabled) {
        border-color: ${v.borderDorado};
        color: ${v.colorPrincipal};
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
`;
