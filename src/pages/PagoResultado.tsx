import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import { v } from "../styles/variables";

interface Props {
  tipo: "exito" | "fallo" | "pendiente";
}

const TEXTOS: Record<
  Props["tipo"],
  { icono: string; titulo: string; mensaje: string }
> = {
  exito: {
    icono: "✓",
    titulo: "¡Pago aprobado!",
    mensaje: "Estamos confirmando tu pedido, puede tardar unos segundos.",
  },
  fallo: {
    icono: "✕",
    titulo: "El pago no se pudo procesar",
    mensaje:
      "No te preocupes, no se descontó ninguna pieza. Podés intentar de nuevo.",
  },
  pendiente: {
    icono: "…",
    titulo: "Pago pendiente",
    mensaje: "Tu pago está siendo procesado. Te vamos a avisar apenas se confirme.",
  },
};

export function PagoResultado({ tipo }: Props) {
  const [params] = useSearchParams();
  const idOrdenExterna = params.get("id");
  const { icono, titulo, mensaje } = TEXTOS[tipo];

  return (
    <Container>
      <span className={`icono icono--${tipo}`}>{icono}</span>
      <h1>{titulo}</h1>
      <p>{mensaje}</p>
      {idOrdenExterna && (
        <Link className="ver-pedido" to={`/pedido/${idOrdenExterna}`}>
          Ver estado de mi pedido
        </Link>
      )}
      <Link className="volver" to="/">
        Volver al catálogo
      </Link>
    </Container>
  );
}

const Container = styled.div`
  max-width: 460px;
  margin: 80px auto;
  padding: 0 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;

  .icono {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    &--exito {
      background: rgba(243, 210, 12, 0.12);
      border: 1px solid ${v.borderDorado};
      color: ${v.colorPrincipal};
    }
    &--fallo {
      background: rgba(255, 90, 90, 0.1);
      border: 1px solid rgba(255, 90, 90, 0.35);
      color: #ff8a80;
    }
    &--pendiente {
      background: rgba(144, 70, 255, 0.12);
      border: 1px solid rgba(144, 70, 255, 0.4);
      color: ${v.colorExito};
    }
  }

  h1 {
    font-size: 22px;
    margin: 0;
  }

  p {
    color: ${v.colorTextoSuave};
    line-height: 1.5;
  }

  .ver-pedido {
    font-weight: 700;
    color: ${v.colorPrincipal};
    text-decoration: none;
  }

  .volver {
    color: ${v.colorTextoSuave2};
    text-decoration: none;
    font-size: 13.5px;
    &:hover {
      color: ${v.colorTexto};
    }
  }
`;
