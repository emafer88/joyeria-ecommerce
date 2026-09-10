import styled from "styled-components";
import { FiTruck, FiShield, FiRefreshCw, FiLock } from "react-icons/fi";
import { v } from "../../styles/variables";

const BENEFICIOS = [
  {
    icono: FiTruck,
    titulo: "Envío a todo México",
    texto: "Empaque seguro con seguimiento en cada pedido.",
  },
  {
    icono: FiShield,
    titulo: "Garantía en tus piezas",
    texto: "Respaldo en materiales y fabricación.",
  },
  {
    icono: FiRefreshCw,
    titulo: "Devoluciones simples",
    texto: "Cambios y devoluciones sin complicaciones.",
  },
  {
    icono: FiLock,
    titulo: "Pagos 100% seguros",
    texto: "Checkout protegido en cada compra.",
  },
];

export function SeccionBeneficios() {
  return (
    <Container>
      {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
        <div className="item" key={titulo}>
          <span className="icono">
            <Icono />
          </span>
          <div>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </div>
        </div>
      ))}
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
    background: rgba(243, 210, 12, 0.12);
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
