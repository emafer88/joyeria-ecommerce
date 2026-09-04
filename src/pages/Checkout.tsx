import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCarritoStore, useTotalCarrito } from "../store/CarritoStore";
import { useCrearPreferenciaMutation } from "../tanstack/CheckoutStack";
import { claveCarritoItem } from "../types/dominio";
import { v } from "../styles/variables";

export function Checkout() {
  const items = useCarritoStore((s) => s.items);
  const vaciar = useCarritoStore((s) => s.vaciar);
  const total = useTotalCarrito();
  const [enviando, setEnviando] = useState(false);

  const { mutateAsync } = useCrearPreferenciaMutation();

  if (items.length === 0) {
    return (
      <Container>
        <h1>Checkout</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/">Ir al catálogo</Link>
      </Container>
    );
  }

  const pagar = async () => {
    setEnviando(true);
    try {
      const { initPoint } = await mutateAsync(items);
      vaciar();
      window.location.href = initPoint;
    } catch (err) {
      toast.error((err as Error).message);
      setEnviando(false);
    }
  };

  return (
    <Container>
      <h1>Checkout</h1>

      <ul className="resumen">
        {items.map((item) => (
          <li key={claveCarritoItem(item)}>
            <span>
              {item.nombre}
              {item.tipo === "stock" ? ` x${item.cantidad}` : " (pieza única)"}
            </span>
            <span>
              $
              {(
                item.precioVenta * (item.tipo === "stock" ? item.cantidad : 1)
              ).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      <div className="total">Total: $ {total.toLocaleString()}</div>

      <button type="button" disabled={enviando} onClick={pagar}>
        {enviando ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
      </button>

      <p className="nota">
        Vas a ser redirigido a Mercado Pago para completar el pago de forma
        segura. Al confirmar, reservamos tus piezas de joyería por un tiempo
        limitado.
      </p>
    </Container>
  );
}

const Container = styled.div`
  max-width: 560px;
  margin: 40px auto;
  padding: 0 24px 60px;

  h1 {
    font-size: 26px;
    margin: 0 0 24px;
  }

  a {
    color: ${v.colorPrincipal};
  }

  .resumen {
    list-style: none;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 20px;
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
    font-size: 20px;
    font-weight: 700;
    text-align: right;
    margin-bottom: 20px;
    color: ${v.colorTexto};
  }

  button {
    width: 100%;
    padding: 15px;
    border-radius: 12px;
    border: none;
    background: #009ee3;
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .nota {
    margin-top: 16px;
    font-size: 12.5px;
    color: ${v.colorTextoSuave2};
    text-align: center;
    line-height: 1.5;
  }
`;
