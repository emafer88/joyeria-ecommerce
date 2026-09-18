import styled from "styled-components";
import { Link, useParams } from "react-router-dom";
import { useEstadoPedidoQuery } from "../tanstack/CheckoutStack";
import { lineaDireccion } from "../utils/direccion";
import { v } from "../styles/variables";

const ETIQUETAS: Record<string, string> = {
  pendiente: "Esperando confirmación del pago...",
  confirmada: "¡Pedido confirmado!",
  anulada: "Pedido anulado (el pago no se completó)",
};

const ICONOS: Record<string, string> = {
  pendiente: "…",
  confirmada: "✓",
  anulada: "✕",
};

const PASOS_ENVIO = ["Pago recibido", "Preparando", "Enviado", "Entregado"];

function pasoActual(estadoEnvio: string | null): number {
  if (estadoEnvio === "preparando") return 1;
  if (estadoEnvio === "enviado") return 2;
  if (estadoEnvio === "entregado") return 3;
  return 0;
}

const METODOS_PAGO: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  prepaid_card: "Tarjeta prepaga",
  account_money: "Dinero en cuenta de Mercado Pago",
  ticket: "Efectivo / Ticket",
  bank_transfer: "Transferencia bancaria",
  digital_currency: "Billetera digital",
};

export function EstadoPedidoPagina() {
  const { idOrdenExterna } = useParams<{ idOrdenExterna: string }>();
  const { data, isLoading, isError } = useEstadoPedidoQuery(idOrdenExterna);

  if (isLoading) return <Container>Cargando pedido...</Container>;
  if (isError || !data)
    return (
      <Container>
        <p>No encontramos ese pedido.</p>
        <Link to="/catalogo">Volver al catálogo</Link>
      </Container>
    );

  const paso = data.estado === "confirmada" ? pasoActual(data.estadoEnvio) : null;

  return (
    <Container>
      {paso === null ? (
        <>
          <span className={`icono icono--${data.estado}`}>
            {ICONOS[data.estado] ?? ""}
          </span>
          <span className={`etiqueta etiqueta--${data.estado}`}>
            {ETIQUETAS[data.estado] ?? data.estado}
          </span>
        </>
      ) : (
        <ol className="tracker">
          {PASOS_ENVIO.map((nombre, i) => (
            <li
              key={nombre}
              className={
                i < paso ? "hecho" : i === paso ? "actual" : "pendiente"
              }
            >
              <span className="punto">{i < paso ? "✓" : i + 1}</span>
              <span className="nombre">{nombre}</span>
            </li>
          ))}
        </ol>
      )}
      {data.nroComprobante && (
        <p className="comprobante">Número de pedido: {data.nroComprobante}</p>
      )}
      {data.metodoPago && (
        <p className="metodo-pago">
          Método de pago: {METODOS_PAGO[data.metodoPago] ?? data.metodoPago}
        </p>
      )}

      <ul className="items">
        {data.items.map((item, i) => (
          <li key={i}>
            <span>
              {item.nombre} x{item.cantidad}
            </span>
            <span>$ {item.total.toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="total">Total: $ {data.montoTotal.toLocaleString()}</div>

      {data.envio && (
        <div className="envio">
          <h2>Envío a</h2>
          <p className="dest">
            <strong>{data.envio.destinatario}</strong> · Tel.{" "}
            {data.envio.telefono}
          </p>
          <p>{lineaDireccion(data.envio)}</p>
          {data.envio.entreCalles && (
            <p className="extra">Entre calles: {data.envio.entreCalles}</p>
          )}
          {data.envio.referencias && (
            <p className="extra">Referencias: {data.envio.referencias}</p>
          )}
        </div>
      )}

      <Link to="/catalogo">Volver al catálogo</Link>
    </Container>
  );
}

const Container = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px 60px;

  a {
    color: ${v.colorPrincipal};
    text-decoration: none;
  }

  .icono {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 10px;
    &--confirmada {
      background: rgba(243, 210, 12, 0.12);
      border: 1px solid ${v.borderDorado};
      color: ${v.colorPrincipal};
    }
    &--pendiente {
      background: rgba(144, 70, 255, 0.12);
      border: 1px solid rgba(144, 70, 255, 0.4);
      color: ${v.colorExito};
    }
    &--anulada {
      background: rgba(255, 90, 90, 0.1);
      border: 1px solid rgba(255, 90, 90, 0.35);
      color: #ff8a80;
    }
  }

  .etiqueta {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 14px;
    &--confirmada {
      background: rgba(243, 210, 12, 0.12);
      border: 1px solid ${v.borderDorado};
      color: ${v.colorPrincipal};
    }
    &--pendiente {
      background: rgba(144, 70, 255, 0.12);
      border: 1px solid rgba(144, 70, 255, 0.4);
      color: ${v.colorExito};
    }
    &--anulada {
      background: rgba(255, 90, 90, 0.1);
      border: 1px solid rgba(255, 90, 90, 0.35);
      color: #ff8a80;
    }
  }

  .tracker {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    li {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      position: relative;

      &:not(:last-child)::after {
        content: "";
        position: absolute;
        top: 14px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: ${v.borderSutil};
        z-index: 0;
      }
      &.hecho:not(:last-child)::after {
        background: ${v.borderDorado};
      }
    }

    .punto {
      z-index: 1;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      background: ${v.bgTarjeta};
      border: 1px solid ${v.borderSutil};
      color: ${v.colorTextoSuave2};
    }
    .nombre {
      font-size: 11.5px;
      color: ${v.colorTextoSuave2};
    }

    li.hecho .punto,
    li.actual .punto {
      border-color: ${v.borderDorado};
      color: ${v.colorPrincipal};
      background: rgba(243, 210, 12, 0.12);
    }
    li.hecho .nombre,
    li.actual .nombre {
      color: ${v.colorTexto};
      font-weight: 600;
    }
  }

  .comprobante {
    color: ${v.colorTextoSuave};
  }

  .metodo-pago {
    color: ${v.colorTextoSuave};
    margin-top: -8px;
  }

  .items {
    list-style: none;
    padding: 20px;
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: ${v.bgTarjeta};
    border: 1px solid ${v.borderSutil};
    border-radius: ${v.borderRadius};
    li {
      display: flex;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid ${v.borderSutil};
      font-size: 14px;
      color: ${v.colorTextoSuave};
      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    }
  }

  .total {
    font-size: 19px;
    font-weight: 700;
    text-align: right;
    margin-bottom: 24px;
    color: ${v.colorTexto};
  }

  .envio {
    padding: 16px 18px;
    margin-bottom: 24px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    border-radius: ${v.borderRadius};

    h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${v.colorPrincipal};
      margin: 0 0 8px;
    }
    p {
      margin: 0 0 4px;
      font-size: 13.5px;
      color: ${v.colorTextoSuave};
    }
    .dest strong {
      color: ${v.colorTexto};
    }
    .extra {
      font-size: 12.5px;
      color: ${v.colorTextoSuave2};
    }
  }
`;
