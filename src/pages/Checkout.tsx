import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCarritoStore, useTotalCarrito } from "../store/CarritoStore";
import { useAuthStore, nombreVisible } from "../store/AuthStore";
import { useCrearPreferenciaMutation } from "../tanstack/CheckoutStack";
import { useCostoEnvioQuery } from "../tanstack/CatalogoStack";
import { SelectorDireccion } from "../components/organismos/SelectorDireccion";
import { claveCarritoItem } from "../types/dominio";
import type { EnvioCheckout } from "../supabaseCrud/crudCheckout";
import { v } from "../styles/variables";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Checkout() {
  const items = useCarritoStore((s) => s.items);
  const vaciar = useCarritoStore((s) => s.vaciar);
  const subtotal = useTotalCarrito();
  const { data: costoEnvio = 0 } = useCostoEnvioQuery();
  const total = subtotal + costoEnvio;
  const [enviando, setEnviando] = useState(false);
  const [envio, setEnvio] = useState<EnvioCheckout | null>(null);

  const user = useAuthStore((s) => s.user);
  const [nombre, setNombre] = useState(() =>
    user ? nombreVisible(user) : ""
  );
  const [email, setEmail] = useState(() => user?.email ?? "");

  const { mutateAsync } = useCrearPreferenciaMutation();

  if (items.length === 0) {
    return (
      <Container>
        <h1>Checkout</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/catalogo">Ir al catálogo</Link>
      </Container>
    );
  }

  const nombreValido = nombre.trim().length > 0;
  const emailValido = EMAIL_RE.test(email.trim());
  const contactoValido = nombreValido && emailValido;

  const pagar = async () => {
    if (!contactoValido) {
      toast.error("Completá tu nombre y un email válido.");
      return;
    }
    if (!envio) {
      toast.error("Elegí o cargá una dirección de envío.");
      return;
    }
    setEnviando(true);
    try {
      const { initPoint } = await mutateAsync({
        items,
        envio,
        cliente: { nombre: nombre.trim(), email: email.trim() },
      });
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

      <div className="contacto">
        <h2>Datos de contacto</h2>
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <SelectorDireccion onEnvio={setEnvio} />

      <div className="totales">
        <div className="linea">Subtotal: $ {subtotal.toLocaleString()}</div>
        <div className="linea">Envío: $ {costoEnvio.toLocaleString()}</div>
        <div className="total">Total: $ {total.toLocaleString()}</div>
      </div>

      <button
        type="button"
        disabled={enviando || !envio || !contactoValido}
        onClick={pagar}
      >
        {enviando
          ? "Redirigiendo a Mercado Pago..."
          : !contactoValido
            ? "Completá tus datos de contacto"
            : !envio
              ? "Elegí una dirección de envío"
              : "Pagar con Mercado Pago"}
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
  max-width: 640px;
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

  .contacto {
    margin-bottom: 24px;
    h2 {
      font-size: 16px;
      margin: 0 0 10px;
    }
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    label {
      font-size: 12px;
      font-weight: 600;
      color: ${v.colorTextoSuave};
    }
    input {
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
  }

  .totales {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .linea {
    font-size: 14px;
    color: ${v.colorTextoSuave2};
  }

  .total {
    font-size: 20px;
    font-weight: 700;
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
