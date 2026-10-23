import styled from "styled-components";
import type { IconType } from "react-icons";
import {
  FiTruck,
  FiShield,
  FiRefreshCw,
  FiLock,
  FiGift,
  FiHeadphones,
  FiAward,
} from "react-icons/fi";
import { GiCutDiamond } from "react-icons/gi";
import type { Beneficio, IconoBeneficio } from "../../data/disenoTienda";
import { v } from "../../styles/variables";

const ICONOS: Record<IconoBeneficio, IconType> = {
  envio: FiTruck,
  garantia: FiShield,
  devolucion: FiRefreshCw,
  pago: FiLock,
  regalo: FiGift,
  diamante: GiCutDiamond,
  atencion: FiHeadphones,
  certificado: FiAward,
};

export function SeccionBeneficios({ beneficios }: { beneficios: Beneficio[] }) {
  const conTexto = beneficios.filter((b) => b.titulo || b.texto);
  if (conTexto.length === 0) return null;
  return (
    <Container>
      {conTexto.map(({ icono, titulo, texto }, i) => {
        const Icono = ICONOS[icono];
        return (
          <div className="item" key={i}>
            <span className="icono">
              <Icono />
            </span>
            <div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          </div>
        );
      })}
    </Container>
  );
}

const Container = styled.section`
  max-width: 1180px;
  margin: 50px auto 0;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }

  .item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 18px;
    border-radius: ${v.borderRadius};
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
  }

  .icono {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(var(--c-principal-rgb), 0.12);
    color: ${v.colorPrincipal};
    font-size: 18px;
  }

  h3 {
    margin: 2px 0 4px;
    font-size: 13.5px;
  }

  p {
    margin: 0;
    color: ${v.colorTextoSuave};
    font-size: 12px;
    line-height: 1.4;
  }
`;
