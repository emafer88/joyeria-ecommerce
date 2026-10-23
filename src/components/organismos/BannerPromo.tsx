import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";
import type { Promo } from "../../data/disenoTienda";

// Respaldo cuando no hay ningún producto con oferta activa en este momento
// (ver Inicio.tsx: si `enOferta` no está vacío, se muestra una vitrina de
// productos en oferta real en su lugar). Aviso que invita a ver el catálogo,
// para no dejar la sección vacía; los textos se editan en el admin.
export function BannerPromo({ promo }: { promo: Promo }) {
  return (
    <Container>
      <div className="texto">
        {promo.etiqueta && <span className="etiqueta">{promo.etiqueta}</span>}
        {promo.titulo && <h2>{promo.titulo}</h2>}
        {promo.texto && <p>{promo.texto}</p>}
      </div>
      {promo.boton && (
        <Link className="cta" to="/catalogo">
          {promo.boton}
        </Link>
      )}
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
    rgba(var(--c-principal-rgb), 0.12),
    rgba(var(--c-secundario-rgb), 0.1)
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
    color: var(--c-sobre-principal);
    font-weight: 700;
    font-size: 13.5px;
    text-decoration: none;
    transition: 0.2s;
    &:hover {
      filter: brightness(1.08);
    }
  }
`;
