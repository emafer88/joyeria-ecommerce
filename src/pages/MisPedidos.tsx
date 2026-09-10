import styled from "styled-components";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/AuthStore";
import { useMisPedidosQuery } from "../tanstack/AuthStack";
import { v } from "../styles/variables";

const ETIQUETAS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmado",
  anulada: "Anulado",
};

export function MisPedidos() {
  const session = useAuthStore((s) => s.session);
  const { data, isLoading, isError, error } = useMisPedidosQuery(!!session);

  return (
    <Container>
      <span className="etiqueta">Tu cuenta</span>
      <h1>Mis pedidos</h1>

      {isLoading && <p>Cargando pedidos...</p>}
      {isError && (
        <p className="error">
          No se pudieron cargar tus pedidos: {(error as Error).message}
        </p>
      )}
      {data && data.length === 0 && (
        <p>
          Todavía no hiciste ningún pedido. <Link to="/catalogo">Ir al catálogo</Link>
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="lista">
          {data.map((pedido) => (
            <li key={pedido.idOrdenExterna}>
              <Link to={`/pedido/${pedido.idOrdenExterna}`}>
                <div className="fila">
                  <span className="fecha">
                    {new Date(pedido.fecha).toLocaleDateString()}
                  </span>
                  <span className={`estado estado--${pedido.estado}`}>
                    {ETIQUETAS[pedido.estado] ?? pedido.estado}
                  </span>
                </div>
                <div className="fila">
                  <span className="detalle">
                    {pedido.cantidadProductos}{" "}
                    {pedido.cantidadProductos === 1 ? "producto" : "productos"}
                    {pedido.nroComprobante ? ` · ${pedido.nroComprobante}` : ""}
                  </span>
                  <span className="monto">
                    $ {pedido.montoTotal.toLocaleString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

const Container = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px 60px;

  a {
    color: ${v.colorPrincipal};
    text-decoration: none;
  }

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

  .error {
    color: #ff8a80;
  }

  .lista {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;

    li a {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border: 1px solid ${v.borderSutil};
      background: ${v.bgTarjeta};
      border-radius: ${v.borderRadius};
      color: ${v.colorTexto};
      transition: 0.2s;
      &:hover {
        border-color: ${v.borderDorado};
        background: ${v.bgTarjetaHover};
      }
    }
  }

  .fila {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .fecha {
    font-weight: 600;
    font-size: 14px;
  }

  .detalle {
    font-size: 13px;
    color: ${v.colorTextoSuave};
  }

  .monto {
    font-weight: 700;
    color: ${v.colorPrincipal};
  }

  .estado {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 20px;
    border: 1px solid ${v.borderSutil};
    &--confirmada {
      color: ${v.colorPrincipal};
      border-color: ${v.borderDorado};
      background: rgba(243, 210, 12, 0.1);
    }
    &--pendiente {
      color: ${v.colorExito};
      border-color: rgba(144, 70, 255, 0.4);
      background: rgba(144, 70, 255, 0.1);
    }
    &--anulada {
      color: #ff8a80;
      border-color: rgba(255, 90, 90, 0.35);
      background: rgba(255, 90, 90, 0.1);
    }
  }
`;
