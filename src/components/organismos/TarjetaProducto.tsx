import styled from "styled-components";
import { Link } from "react-router-dom";
import type { ProductoCatalogo } from "../../types/dominio";
import { v } from "../../styles/variables";

interface Props {
  producto: ProductoCatalogo;
}

export function TarjetaProducto({ producto }: Props) {
  const sinStock =
    producto.totalDisponible !== null && producto.totalDisponible <= 0;

  return (
    <Container to={`/producto/${producto.id}`}>
      <div className="imagen">
        {producto.imagenPortada ? (
          <img src={producto.imagenPortada} alt={producto.nombre} />
        ) : (
          <div className="sin-imagen">Sin imagen</div>
        )}
        {sinStock && <span className="badge-agotado">Agotado</span>}
      </div>
      <div className="info">
        <span className="categoria">{producto.categoria}</span>
        <h3>{producto.nombre}</h3>
        <span className="precio">
          {producto.precioVenta > 0
            ? `$ ${producto.precioVenta.toLocaleString()}`
            : "Consultar precio"}
        </span>
      </div>
    </Container>
  );
}

const Container = styled(Link)`
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: ${v.borderRadius};
  overflow: hidden;
  background: ${v.bgTarjeta};
  border: 1px solid ${v.borderSutil};
  transition: 0.2s;

  &:hover {
    transform: translateY(-3px);
    border-color: ${v.borderDorado};
    background: ${v.bgTarjetaHover};
  }

  .imagen {
    position: relative;
    aspect-ratio: 1 / 1;
    background: rgba(255, 255, 255, 0.03);
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .sin-imagen {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${v.colorTextoSuave2};
      font-size: 13px;
    }
    .badge-agotado {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: ${v.colorTexto};
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 20px;
      border: 1px solid ${v.borderSutil};
    }
  }

  .info {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .categoria {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${v.colorTextoSuave2};
  }

  h3 {
    margin: 0;
    font-size: 15px;
    color: ${v.colorTexto};
  }

  .precio {
    font-weight: 700;
    color: ${v.colorPrincipal};
  }
`;
