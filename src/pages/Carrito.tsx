import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import {
  useCarritoStore,
  useTotalCarrito,
} from "../store/CarritoStore";
import { claveCarritoItem } from "../types/dominio";
import { v } from "../styles/variables";

export function Carrito() {
  const items = useCarritoStore((s) => s.items);
  const actualizarCantidad = useCarritoStore((s) => s.actualizarCantidad);
  const quitarItem = useCarritoStore((s) => s.quitarItem);
  const vaciar = useCarritoStore((s) => s.vaciar);
  const total = useTotalCarrito();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Container>
        <h1>Tu carrito</h1>
        <p>Todavía no agregaste nada.</p>
        <Link to="/catalogo">Ir al catálogo</Link>
      </Container>
    );
  }

  return (
    <Container>
      <h1>Tu carrito</h1>

      <ul className="items">
        {items.map((item) => {
          const clave = claveCarritoItem(item);
          return (
            <li key={clave}>
              {item.imagen ? (
                <img src={item.imagen} alt={item.nombre} />
              ) : (
                <div className="sin-imagen" />
              )}
              <div className="detalle">
                <span className="nombre">{item.nombre}</span>
                {item.tipo === "pieza" && (
                  <span className="meta">
                    {item.material}
                    {item.pureza ? ` (${item.pureza})` : ""} — pieza única
                  </span>
                )}
                <span className="precio">
                  $ {item.precioVenta.toLocaleString()}
                </span>
              </div>

              {item.tipo === "stock" ? (
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) =>
                    actualizarCantidad(
                      item.idProducto,
                      Math.max(1, Number(e.target.value) || 1)
                    )
                  }
                />
              ) : (
                <span className="cantidad-fija">1</span>
              )}

              <button type="button" onClick={() => quitarItem(clave)}>
                Quitar
              </button>
            </li>
          );
        })}
      </ul>

      <div className="resumen">
        <button type="button" className="vaciar" onClick={vaciar}>
          Vaciar carrito
        </button>
        <span className="total">Total: $ {total.toLocaleString()}</span>
        <button
          type="button"
          className="checkout"
          onClick={() => navigate("/checkout")}
        >
          Finalizar compra
        </button>
      </div>
    </Container>
  );
}

const Container = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 24px 60px;

  h1 {
    margin: 0 0 24px;
    font-size: 26px;
  }

  a {
    color: ${v.colorPrincipal};
  }

  .items {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  li {
    display: grid;
    grid-template-columns: 64px 1fr auto auto;
    align-items: center;
    gap: 14px;
    padding: 12px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    border-radius: ${v.borderRadius};

    img,
    .sin-imagen {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      object-fit: cover;
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .detalle {
    display: flex;
    flex-direction: column;
    gap: 3px;
    .nombre {
      font-weight: 600;
    }
    .meta {
      font-size: 12px;
      color: ${v.colorTextoSuave2};
    }
    .precio {
      font-weight: 700;
      color: ${v.colorPrincipal};
    }
  }

  input[type="number"] {
    width: 60px;
    padding: 7px;
    border-radius: 8px;
    border: 1px solid ${v.borderSutil};
    background: rgba(255, 255, 255, 0.03);
    color: ${v.colorTexto};
    font-family: inherit;
  }

  .cantidad-fija {
    text-align: center;
    color: ${v.colorTextoSuave2};
    font-size: 13px;
  }

  button {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTexto};
    cursor: pointer;
    font-family: inherit;
    transition: 0.2s;
    &:hover:not(:disabled) {
      border-color: ${v.borderDorado};
      color: ${v.colorPrincipal};
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .resumen {
    margin-top: 28px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    .total {
      font-size: 19px;
      font-weight: 700;
      color: ${v.colorTexto};
    }
    .checkout {
      background: ${v.colorPrincipal};
      border-color: ${v.borderDorado};
      color: #1a1206;
      font-weight: 700;
      &:hover {
        filter: brightness(1.08);
        color: #1a1206;
      }
    }
  }
`;
