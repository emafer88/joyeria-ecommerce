import styled from "styled-components";
import { v } from "../styles/variables";

// Se muestra en lugar de toda la tienda si la cuenta está suspendida o el
// plan contratado no incluye la tienda en línea.
export function TiendaNoDisponible() {
  return (
    <Container>
      <div className="tarjeta">
        <span className="icono">💎</span>
        <h1>Tienda no disponible</h1>
        <p>
          Nuestra tienda en línea no está disponible por el momento. Vuelve a
          visitarnos pronto.
        </p>
      </div>
    </Container>
  );
}

const Container = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: ${v.bgFondo};
  color: ${v.colorTexto};
  .tarjeta {
    max-width: 440px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 32px 24px;
    background: ${v.bgTarjeta};
    border: 1px solid ${v.borderDorado};
    border-radius: ${v.borderRadius};
  }
  .icono {
    font-size: 44px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
    color: ${v.colorPrincipal};
  }
  p {
    margin: 0;
    line-height: 1.5;
    color: ${v.colorTextoSuave};
  }
`;
