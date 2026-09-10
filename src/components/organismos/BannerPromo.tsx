import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";

// Respaldo cuando no hay ningún producto con oferta activa en este momento
// (ver Inicio.tsx: si `enOferta` no está vacío, se muestra una vitrina de
// productos en oferta real en su lugar). Aviso genérico que invita a
// consultar/ver el catálogo, para no dejar la sección vacía.
export function BannerPromo() {
  return (
    <Container>
      <div className="texto">
        <span className="etiqueta">Promociones</span>
        <h2>Consultá nuestras ofertas de temporada</h2>
        <p>Piezas seleccionadas con condiciones especiales, todo el año.</p>
      </div>
      <Link className="cta" to="/catalogo">
        Ver catálogo
      </Link>
    </Container>
  );
}

const Container = styled.section`
  max-width: 1180px;
  margin: 40px auto 0;
  padding: 30px 28px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-radius: ${v.borderRadius};
  border: 1px solid ${v.borderDorado};
  background: linear-gradient(
    120deg,
    rgba(243, 210, 12, 0.12),
    rgba(144, 70, 255, 0.1)
  );

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h2 {
    margin: 6px 0 4px;
    font-size: 19px;
  }

  p {
    margin: 0;
    color: ${v.colorTextoSuave};
    font-size: 13.5px;
  }

  .cta {
    flex-shrink: 0;
    padding: 12px 24px;
    border-radius: 30px;
    border: 1px solid ${v.borderDorado};
    background: ${v.colorPrincipal};
    color: #1a1206;
    font-weight: 700;
    font-size: 13.5px;
    text-decoration: none;
    transition: 0.2s;
    &:hover {
      filter: brightness(1.08);
    }
  }
`;
