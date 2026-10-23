import styled from "styled-components";
import { FiInstagram, FiFacebook } from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";
import type { Contacto } from "../../data/disenoTienda";
import { v } from "../../styles/variables";

interface Props {
  titulo: string;
  subtitulo: string;
  contacto: Contacto;
}

// Sin ninguna red cargada en el admin, la sección no se muestra.
export function SeccionRedesSociales({ titulo, subtitulo, contacto }: Props) {
  if (!contacto.instagram && !contacto.facebook && !contacto.tiktok) return null;
  return (
    <Container>
      {titulo && <h2>{titulo}</h2>}
      {subtitulo && <p>{subtitulo}</p>}
      <div className="iconos">
        {contacto.instagram && (
          <a href={contacto.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
            <FiInstagram />
          </a>
        )}
        {contacto.facebook && (
          <a href={contacto.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
            <FiFacebook />
          </a>
        )}
        {contacto.tiktok && (
          <a href={contacto.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
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
