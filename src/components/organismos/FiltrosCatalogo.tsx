import styled from "styled-components";
import { useCategoriasQuery } from "../../tanstack/CatalogoStack";
import { useFiltrosCatalogoStore } from "../../store/FiltrosCatalogoStore";
import { v } from "../../styles/variables";

// Materiales de joyería con los que se cargan las variantes en el POS. El RPC
// `ecommerce_listar_productos` matchea `producto_variantes.material` con ILIKE,
// así que alcanza con estos valores fijos (backlog: `ecommerce_listar_materiales`).
const MATERIALES = ["Oro", "Plata", "Acero", "Fantasía"];

export function FiltrosCatalogo() {
  const { data: categorias, isLoading } = useCategoriasQuery();
  const {
    filtros,
    setCategoria,
    setMaterial,
    setBuscador,
    setRangoPrecio,
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
          {MATERIALES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

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
