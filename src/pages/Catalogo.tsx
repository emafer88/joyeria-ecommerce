import styled from "styled-components";
import { useProductosQuery } from "../tanstack/CatalogoStack";
import { useFiltrosCatalogoStore } from "../store/FiltrosCatalogoStore";
import { TarjetaProducto } from "../components/organismos/TarjetaProducto";
import { FiltrosCatalogo } from "../components/organismos/FiltrosCatalogo";
import { v } from "../styles/variables";

export function Catalogo() {
  const { filtros, setPagina } = useFiltrosCatalogoStore();
  const { data, isLoading, isError, error } = useProductosQuery(filtros);

  const totalPaginas = data
    ? Math.max(1, Math.ceil(data.totalCount / filtros.tamPagina))
    : 1;

  return (
    <Container>
      <span className="etiqueta">Catálogo</span>
      <h1>Piezas disponibles</h1>
      <div className="layout">
        <FiltrosCatalogo />
        <div className="resultados">
          {isLoading && <p>Cargando productos...</p>}
          {isError && (
            <p className="error">
              No se pudo cargar el catálogo: {(error as Error).message}
            </p>
          )}
          {data && data.items.length === 0 && (
            <p>No hay productos que coincidan con estos filtros.</p>
          )}

          <div className="grilla">
            {data?.items.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>

          {data && data.totalCount > filtros.tamPagina && (
            <div className="paginacion">
              <button
                type="button"
                disabled={filtros.pagina <= 1}
                onClick={() => setPagina(filtros.pagina - 1)}
              >
                Anterior
              </button>
              <span>
                Página {filtros.pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={filtros.pagina >= totalPaginas}
                onClick={() => setPagina(filtros.pagina + 1)}
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

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 24px;
    font-size: 28px;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    @media (min-width: 768px) {
      grid-template-columns: 240px 1fr;
    }
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

  .error {
    color: #ff8a80;
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
