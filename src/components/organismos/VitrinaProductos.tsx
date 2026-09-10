import styled from "styled-components";
import { Link } from "react-router-dom";
import type { ProductoCatalogo } from "../../types/dominio";
import { TarjetaProducto } from "./TarjetaProducto";
import { v } from "../../styles/variables";

interface Props {
  titulo: string;
  subtitulo?: string;
  productos: ProductoCatalogo[];
  cargando?: boolean;
}

/** Franja horizontal de productos (destacados / nuevos), reutiliza
 *  TarjetaProducto. Si no hay productos que mostrar, no renderiza nada. */
export function VitrinaProductos({
  titulo,
  subtitulo,
  productos,
  cargando,
}: Props) {
  if (!cargando && productos.length === 0) return null;

  return (
    <Container>
      <div className="encabezado">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <Link className="ver-todos" to="/catalogo">
          Ver todo →
        </Link>
      </div>

      {cargando ? (
        <p className="cargando">Cargando productos...</p>
      ) : (
        <div className="fila">
          {productos.map((p) => (
            <div className="item" key={p.id}>
              <TarjetaProducto producto={p} />
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

const Container = styled.section`
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 24px 10px;

  .encabezado {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  h2 {
    margin: 0;
    font-size: 22px;
  }

  p {
    margin: 4px 0 0;
    color: ${v.colorTextoSuave};
    font-size: 13.5px;
  }

  .ver-todos {
    flex-shrink: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: ${v.colorPrincipal};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  .cargando {
    color: ${v.colorTextoSuave2};
  }

  .fila {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }

  .item {
    flex: 0 0 190px;
    scroll-snap-align: start;
    @media (min-width: 576px) {
      flex-basis: 220px;
    }
  }
`;
