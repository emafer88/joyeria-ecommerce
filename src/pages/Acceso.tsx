import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useAuthStore } from "../store/AuthStore";
import { IniciarConGoogle } from "../supabaseCrud/crudAuth";
import { v } from "../styles/variables";

export function Acceso() {
  const [params] = useSearchParams();
  const destino = params.get("redirect") || "/";
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const cargando = useAuthStore((s) => s.cargando);
  const [redirigiendo, setRedirigiendo] = useState(false);

  // Ya hay sesión (o recién volvió del redirect de Google): al destino.
  useEffect(() => {
    if (session) navigate(destino, { replace: true });
  }, [session, destino, navigate]);

  const entrar = async () => {
    setRedirigiendo(true);
    try {
      await IniciarConGoogle(destino);
      // signInWithOAuth redirige el navegador: si llegamos acá sin redirect,
      // algo falló silenciosamente.
    } catch (err) {
      toast.error((err as Error).message);
      setRedirigiendo(false);
    }
  };

  return (
    <Container>
      <span className="etiqueta">Tu cuenta</span>
      <h1>Ingresá o registrate</h1>
      <p>
        Con tu cuenta guardás tus datos y seguís el estado de todos tus pedidos
        desde un solo lugar.
      </p>

      <button
        type="button"
        onClick={entrar}
        disabled={cargando || redirigiendo}
      >
        <FcGoogle size={20} />
        {redirigiendo ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      <span className="nota">
        No necesitás cuenta para comprar: también podés hacer el checkout como
        invitado.
      </span>
    </Container>
  );
}

const Container = styled.div`
  max-width: 420px;
  margin: 60px auto;
  padding: 0 24px 60px;
  text-align: center;

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 12px;
    font-size: 26px;
  }

  p {
    color: ${v.colorTextoSuave};
    line-height: 1.5;
    margin: 0 0 28px;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 13px 18px;
    border-radius: 12px;
    border: 1px solid ${v.borderSutil};
    background: ${v.colorTexto};
    color: #1a1206;
    font-weight: 700;
    font-size: 15px;
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    &:hover:not(:disabled) {
      filter: brightness(1.05);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .nota {
    display: block;
    margin-top: 18px;
    font-size: 12.5px;
    color: ${v.colorTextoSuave2};
    line-height: 1.5;
  }
`;
