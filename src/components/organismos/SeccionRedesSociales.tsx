import styled from "styled-components";
import { FiInstagram, FiFacebook } from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";
import { NEGOCIO } from "../../data/negocio";
import { v } from "../../styles/variables";

export function SeccionRedesSociales() {
  return (
    <Container>
      <h2>Seguinos en redes</h2>
      <p>Novedades, lanzamientos y detrás de escena de cada pieza.</p>
      <div className="iconos">
        {NEGOCIO.instagram && (
          <a href={NEGOCIO.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
            <FiInstagram />
          </a>
        )}
        {NEGOCIO.facebook && (
          <a href={NEGOCIO.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
            <FiFacebook />
          </a>
        )}
        {NEGOCIO.tiktok && (
          <a href={NEGOCIO.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
            <FaTiktok />
          </a>
        )}
      </div>
    </Container>
  );
}

const Container = styled.section`
  max-width: 1180px;
  margin: 50px auto 0;
  padding: 40px 24px;
  text-align: center;
  border-top: 1px solid ${v.borderSutil};
  border-bottom: 1px solid ${v.borderSutil};

  h2 {
    margin: 0 0 6px;
    font-size: 20px;
  }

  p {
    margin: 0 0 18px;
    color: ${v.colorTextoSuave};
    font-size: 13.5px;
  }

  .iconos {
    display: flex;
    justify-content: center;
    gap: 14px;

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid ${v.borderSutil};
      background: ${v.bgTarjeta};
      color: ${v.colorTexto};
      font-size: 19px;
      transition: 0.2s;
      &:hover {
        border-color: ${v.borderDorado};
        color: ${v.colorPrincipal};
        background: ${v.bgTarjetaHover};
      }
    }
  }
`;
