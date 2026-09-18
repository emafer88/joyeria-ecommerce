import styled from "styled-components";
import {
  useCategoriasQuery,
  useEtiquetasQuery,
  useMarcasQuery,
  useMaterialesQuery,
} from "../../tanstack/CatalogoStack";
import { useFiltrosCatalogoStore } from "../../store/FiltrosCatalogoStore";
import { v } from "../../styles/variables";

export function FiltrosCatalogo() {
  const { data: categorias, isLoading } = useCategoriasQuery();
  const { data: etiquetas } = useEtiquetasQuery();
  const { data: materiales } = useMaterialesQuery();
  const { data: marcas } = useMarcasQuery();
  const {
    filtros,
    setCategoria,
    setMaterial,
    setEtiqueta,
    setBuscador,
    setRangoPrecio,
    setMarca,
    setRangoPeso,
    setTalla,
    setSoloDisponibles,
    limpiarFiltros,
  } = useFiltrosCatalogoStore();

  return (
    <Container>
      <div className="campo">
        <label htmlFor="buscador">Buscar</label>
        <input
          id="buscador"
          type="text"
          placeholder="Nombre del producto..."
          defaultValue={filtros.buscador ?? ""}
          onChange={(e) => setBuscador(e.target.value || null)}
        />
      </div>

      <div className="campo">
        <label htmlFor="categoria">Categoría</label>
        <select
          id="categoria"
          value={filtros.idCategoria ?? ""}
          onChange={(e) =>
            setCategoria(e.target.value ? Number(e.target.value) : null)
          }
          disabled={isLoading}
        >
          <option value="">Todas</option>
          {categorias?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="material">Material</label>
        <select
          id="material"
          value={filtros.material ?? ""}
          onChange={(e) => setMaterial(e.target.value || null)}
        >
          <option value="">Todos</option>
          {materiales?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {marcas && marcas.length > 0 && (
        <div className="campo">
          <label htmlFor="marca">Colección</label>
          <select
            id="marca"
            value={filtros.idMarca ?? ""}
            onChange={(e) =>
              setMarca(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Todas</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {etiquetas && etiquetas.length > 0 && (
        <div className="campo">
          <label htmlFor="etiqueta">Etiqueta</label>
          <select
            id="etiqueta"
            value={filtros.idEtiqueta ?? ""}
            onChange={(e) =>
              setEtiqueta(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Todas</option>
            {etiquetas.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="campo campo--rango">
        <label>Precio</label>
        <div className="rango">
          <input
            type="number"
            placeholder="Min"
            defaultValue={filtros.precioMin ?? ""}
            onChange={(e) =>
              setRangoPrecio(
                e.target.value ? Number(e.target.value) : null,
                filtros.precioMax
              )
            }
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={filtros.precioMax ?? ""}
            onChange={(e) =>
              setRangoPrecio(
                filtros.precioMin,
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
        </div>
      </div>

      <div className="campo campo--rango">
        <label>Peso (g)</label>
        <div className="rango">
          <input
            type="number"
            placeholder="Min"
            defaultValue={filtros.pesoMin ?? ""}
            onChange={(e) =>
              setRangoPeso(
                e.target.value ? Number(e.target.value) : null,
                filtros.pesoMax
              )
            }
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={filtros.pesoMax ?? ""}
            onChange={(e) =>
              setRangoPeso(
                filtros.pesoMin,
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="talla">Talla</label>
        <input
          id="talla"
          type="text"
          placeholder="Ej. 7, M..."
          defaultValue={filtros.talla ?? ""}
          onChange={(e) => setTalla(e.target.value || null)}
        />
      </div>

      <label className="campo--check">
        <input
          type="checkbox"
          checked={filtros.soloDisponibles}
          onChange={(e) => setSoloDisponibles(e.target.checked)}
        />
        Solo disponibles
      </label>

      <button type="button" className="limpiar" onClick={limpiarFiltros}>
        Limpiar filtros
      </button>
    </Container>
  );
}

const Container = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background: ${v.bgTarjeta};
  border: 1px solid ${v.borderSutil};
  border-radius: ${v.borderRadius};
  height: fit-content;

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label {
      font-size: 12px;
      font-weight: 600;
      color: ${v.colorTextoSuave};
    }
    input,
    select {
      padding: 9px 11px;
      border-radius: 8px;
      border: 1px solid ${v.borderSutil};
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTexto};
      font-size: 14px;
      font-family: inherit;
      &::placeholder {
        color: ${v.colorTextoSuave2};
      }
      &:focus {
        outline: none;
        border-color: ${v.borderDorado};
      }
    }
    select option {
      background: #16151f;
      color: ${v.colorTexto};
    }
  }

  .rango {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${v.colorTextoSuave2};
    input {
      width: 100%;
    }
  }

  .campo--check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${v.colorTextoSuave};
    cursor: pointer;
    input {
      accent-color: ${v.colorPrincipal};
    }
  }

  .limpiar {
    padding: 9px;
    border-radius: 8px;
    border: 1px solid ${v.borderSutil};
    background: transparent;
    color: ${v.colorTextoSuave};
    cursor: pointer;
    font-size: 13px;
    transition: 0.2s;
    &:hover {
      border-color: ${v.borderDorado};
      color: ${v.colorPrincipal};
    }
  }
`;
