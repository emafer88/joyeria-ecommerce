import { useEffect, useState, type ReactNode } from "react";
import styled from "styled-components";
import type { FacetasCatalogo, OpcionFaceta } from "../../types/dominio";
import type { useFiltrosUrl } from "../../hooks/useFiltrosUrl";
import { useFuncionesGiro } from "../../tanstack/LicenciaStack";
import { rangosPrecio } from "../../utils/rangosPrecio";
import { v } from "../../styles/variables";

type Control = ReturnType<typeof useFiltrosUrl>;

interface Props extends Control {
  facetas: FacetasCatalogo | undefined;
}

// Texto que se edita localmente pero se reinicia si el valor de la URL cambia
// por fuera (un chip quitado, "Limpiar todo", el buscador del encabezado).
function useTextoDe(externo: string): [string, (v: string) => void] {
  const [texto, setTexto] = useState(externo);
  const [previo, setPrevio] = useState(externo);
  if (externo !== previo) {
    setPrevio(externo);
    setTexto(externo);
  }
  return [texto, setTexto];
}

// Sección plegable del panel; las que tienen algo elegido arrancan abiertas.
function Seccion({
  titulo,
  abierta = true,
  children,
}: {
  titulo: string;
  abierta?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="seccion" open={abierta}>
      <summary>{titulo}</summary>
      <div className="contenido">{children}</div>
    </details>
  );
}

// Lista de casillas con el número de productos de cada opción. Las que
// darían 0 se ven apagadas (salvo que ya estén marcadas).
function Opciones<T extends number | string>({
  opciones,
  elegidas,
  onAlternar,
}: {
  opciones: OpcionFaceta<T>[];
  elegidas: T[];
  onAlternar: (valor: T) => void;
}) {
  const [todas, setTodas] = useState(false);
  const VISIBLES = 6;
  const lista = todas ? opciones : opciones.slice(0, VISIBLES);
  return (
    <>
      {lista.map((o) => {
        const marcada = elegidas.includes(o.id);
        return (
          <label
            key={o.id}
            className={`opcion ${o.hija ? "hija" : ""} ${o.n === 0 && !marcada ? "vacia" : ""}`}
          >
            <input
              type="checkbox"
              checked={marcada}
              onChange={() => onAlternar(o.id)}
            />
            <span className="nombre">{o.nombre}</span>
            <span className="n">{o.n}</span>
          </label>
        );
      })}
      {opciones.length > VISIBLES && (
        <button type="button" className="mas" onClick={() => setTodas(!todas)}>
          {todas ? "− Menos" : `+ Más (${opciones.length - VISIBLES})`}
        </button>
      )}
    </>
  );
}

// Dos números (mínimo y máximo) que se aplican al salir del campo o con Enter.
function RangoLibre({
  min,
  max,
  onAplicar,
}: {
  min: number | null;
  max: number | null;
  onAplicar: (min: number | null, max: number | null) => void;
}) {
  const [a, setA] = useTextoDe(min?.toString() ?? "");
  const [b, setB] = useTextoDe(max?.toString() ?? "");
  const aplicar = () => {
    const nMin = a === "" ? null : Number(a);
    const nMax = b === "" ? null : Number(b);
    if (nMin !== min || nMax !== max) onAplicar(nMin, nMax);
  };
  const enter = (e: React.KeyboardEvent) => e.key === "Enter" && aplicar();
  return (
    <div className="rango">
      <input
        type="number"
        min="0"
        placeholder="Mín"
        value={a}
        onChange={(e) => setA(e.target.value)}
        onBlur={aplicar}
        onKeyDown={enter}
      />
      <span>-</span>
      <input
        type="number"
        min="0"
        placeholder="Máx"
        value={b}
        onChange={(e) => setB(e.target.value)}
        onBlur={aplicar}
        onKeyDown={enter}
      />
    </div>
  );
}

export function FiltrosCatalogo({
  facetas,
  filtros,
  cambiar,
  alternar,
  alternarAtributo,
}: Props) {
  // Material y peso son de las piezas de joyería; talla, de los giros con tallas.
  const { tiene } = useFuncionesGiro();
  const conPiezas = tiene("piezas");
  const conTallas = tiene("tallas") || conPiezas;
  const [busqueda, setBusqueda] = useTextoDe(filtros.buscador ?? "");
  const [talla, setTalla] = useTextoDe(filtros.talla ?? "");

  // Escribir en el buscador filtra solo, medio segundo después de la última tecla.
  useEffect(() => {
    const texto = busqueda.trim() || null;
    if (texto === filtros.buscador) return;
    const t = setTimeout(() => cambiar({ buscador: texto }, true), 500);
    return () => clearTimeout(t);
  }, [busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cada padre seguido de sus subcategorías (con sangría).
  const categorias = (facetas?.categorias ?? [])
    .filter((c) => c.idPadre === null)
    .flatMap((padre) => [
      padre,
      ...(facetas?.categorias ?? [])
        .filter((c) => c.idPadre === padre.id)
        .map((c) => ({ ...c, hija: true })),
    ]);

  const rangos = rangosPrecio(
    facetas?.precio.min ?? null,
    facetas?.precio.max ?? null
  );
  const rangoElegido = (min: number | null, max: number | null) =>
    filtros.precioMin === min && filtros.precioMax === max;

  return (
    <Container>
      <div className="campo">
        <label htmlFor="buscador">Buscar</label>
        <input
          id="buscador"
          type="search"
          placeholder="Nombre del producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {categorias.length > 1 && (
        <Seccion titulo="Categoría">
          <Opciones
            opciones={categorias}
            elegidas={filtros.categorias}
            onAlternar={(id) => alternar("categorias", id)}
          />
        </Seccion>
      )}

      {facetas?.atributos.map((a) => (
        <Seccion key={a.id} titulo={a.nombre}>
          <Opciones
            opciones={a.valores}
            elegidas={filtros.atributos[a.id] ?? []}
            onAlternar={(idValor) => alternarAtributo(a.id, idValor)}
          />
        </Seccion>
      ))}

      <Seccion titulo="Precio">
        {rangos.map((r) => (
          <label key={r.texto} className="opcion">
            <input
              type="radio"
              name="rango-precio"
              checked={rangoElegido(r.min, r.max)}
              onChange={() => cambiar({ precioMin: r.min, precioMax: r.max })}
            />
            <span className="nombre">{r.texto}</span>
          </label>
        ))}
        <RangoLibre
          min={filtros.precioMin}
          max={filtros.precioMax}
          onAplicar={(precioMin, precioMax) => cambiar({ precioMin, precioMax })}
        />
      </Seccion>

      {facetas && (facetas.enOferta > 0 || filtros.enOferta) && (
        <label className="opcion opcion--suelta">
          <input
            type="checkbox"
            checked={filtros.enOferta}
            onChange={(e) => cambiar({ enOferta: e.target.checked })}
          />
          <span className="nombre">En oferta</span>
          <span className="n">{facetas.enOferta}</span>
        </label>
      )}

      {conPiezas && facetas && facetas.materiales.length > 0 && (
        <Seccion titulo="Material">
          <Opciones
            opciones={facetas.materiales}
            elegidas={filtros.materiales}
            onAlternar={(valor) => alternar("materiales", valor)}
          />
        </Seccion>
      )}

      {facetas && facetas.marcas.length > 0 && (
        <Seccion titulo="Colección" abierta={filtros.marcas.length > 0}>
          <Opciones
            opciones={facetas.marcas}
            elegidas={filtros.marcas}
            onAlternar={(id) => alternar("marcas", id)}
          />
        </Seccion>
      )}

      {facetas && facetas.etiquetas.length > 0 && (
        <Seccion titulo="Etiquetas" abierta={filtros.etiquetas.length > 0}>
          <Opciones
            opciones={facetas.etiquetas}
            elegidas={filtros.etiquetas}
            onAlternar={(id) => alternar("etiquetas", id)}
          />
        </Seccion>
      )}

      {conPiezas && (
        <Seccion
          titulo="Peso (g)"
          abierta={filtros.pesoMin !== null || filtros.pesoMax !== null}
        >
          <RangoLibre
            min={filtros.pesoMin}
            max={filtros.pesoMax}
            onAplicar={(pesoMin, pesoMax) => cambiar({ pesoMin, pesoMax })}
          />
        </Seccion>
      )}

      {conTallas && (
        <Seccion titulo="Talla" abierta={filtros.talla !== null}>
          <input
            className="texto"
            type="text"
            placeholder="Ej. 7, M..."
            value={talla}
            onChange={(e) => setTalla(e.target.value)}
            onBlur={() => cambiar({ talla: talla.trim() || null })}
            onKeyDown={(e) =>
              e.key === "Enter" && cambiar({ talla: talla.trim() || null })
            }
          />
        </Seccion>
      )}

      <label className="opcion opcion--suelta">
        <input
          type="checkbox"
          checked={filtros.soloDisponibles}
          onChange={(e) => cambiar({ soloDisponibles: e.target.checked })}
        />
        <span className="nombre">Solo disponibles</span>
      </label>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label {
      font-size: 12px;
      font-weight: 600;
      color: ${v.colorTextoSuave};
    }
  }

  input[type="search"],
  input[type="number"],
  input.texto {
    padding: 9px 11px;
    border-radius: 8px;
    border: 1px solid ${v.borderSutil};
    background: rgba(var(--c-capa-rgb), 0.03);
    color: ${v.colorTexto};
    font-size: 14px;
    font-family: inherit;
    width: 100%;
    &::placeholder {
      color: ${v.colorTextoSuave2};
    }
    &:focus {
      outline: none;
      border-color: ${v.borderDorado};
    }
  }

  .seccion {
    border-top: 1px solid ${v.borderSutil};
    padding-top: 12px;
    summary {
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      list-style: none;
      display: flex;
      justify-content: space-between;
      &::-webkit-details-marker {
        display: none;
      }
      &::after {
        content: "+";
        color: ${v.colorTextoSuave2};
        font-weight: 400;
      }
    }
    &[open] summary::after {
      content: "−";
    }
    .contenido {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }
  }

  .opcion {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 14px;
    cursor: pointer;
    color: ${v.colorTexto};
    input {
      accent-color: ${v.colorPrincipal};
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .nombre {
      flex: 1;
    }
    .n {
      font-size: 12px;
      color: ${v.colorTextoSuave2};
    }
    &.vacia {
      opacity: 0.4;
    }
    &.hija {
      padding-left: 22px;
      font-size: 13.5px;
    }
  }
  .opcion--suelta {
    border-top: 1px solid ${v.borderSutil};
    padding-top: 12px;
    font-weight: 600;
  }

  .mas {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: ${v.colorPrincipal};
    font-size: 13px;
    cursor: pointer;
  }

  .rango {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${v.colorTextoSuave2};
  }
`;
