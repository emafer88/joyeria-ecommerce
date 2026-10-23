import styled from "styled-components";
import { Link } from "react-router-dom";
import { FiMapPin, FiPhone, FiMail, FiInstagram, FiFacebook } from "react-icons/fi";
import { FaWhatsapp, FaTiktok } from "react-icons/fa";
import { useDiseno } from "../../tanstack/DisenoStack";
import { v } from "../../styles/variables";
import logo from "../../assets/logo.png";

export function Footer() {
  const anio = new Date().getFullYear();
  const { contacto } = useDiseno();
  const linkWhatsapp = `https://wa.me/${contacto.whatsapp}`;
  const hayRedes = contacto.instagram || contacto.facebook || contacto.tiktok;

  return (
    <Container>
      <div className="columnas">
        <div className="col marca">
          <div className="isotipo">
            <img src={logo} alt={contacto.nombre} />
          </div>
          {contacto.descripcion && <p>{contacto.descripcion}</p>}
        </div>

        <div className="col">
          <h4>Navegación</h4>
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/mis-pedidos">Mis pedidos</Link>
          <Link to="/mis-direcciones">Mis direcciones</Link>
        </div>

        <div className="col">
          <h4>Contacto</h4>
          {contacto.direccion && (
            <span className="dato">
              <FiMapPin /> {contacto.direccion}
            </span>
          )}
          {contacto.telefono && (
            <a className="dato" href={`tel:${contacto.telefono.replace(/\s/g, "")}`}>
              <FiPhone /> {contacto.telefono}
            </a>
          )}
          {contacto.email && (
            <a className="dato" href={`mailto:${contacto.email}`}>
              <FiMail /> {contacto.email}
            </a>
          )}
          {contacto.whatsapp && (
            <a className="dato" href={linkWhatsapp} target="_blank" rel="noreferrer">
              <FaWhatsapp /> WhatsApp
            </a>
          )}
        </div>

        {hayRedes && (
          <div className="col">
            <h4>Síguenos</h4>
            <div className="redes">
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
          </div>
        )}
      </div>

      <div className="copyright">
        © {anio} {contacto.nombre}. Todos los derechos reservados.
      </div>
    </Container>
  );
}

const Container = styled.footer`
  margin-top: 60px;
  border-top: 1px solid ${v.borderSutil};
  background: rgba(0, 0, 0, 0.2);

  .columnas {
    max-width: 1180px;
    margin: 0 auto;
    padding: 44px 24px 30px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 30px;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 992px) {
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
    }
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 10px;

    a {
      color: ${v.colorTextoSuave};
      text-decoration: none;
      font-size: 13.5px;
      transition: 0.2s;
      &:hover {
        color: ${v.colorPrincipal};
      }
    }
  }

  h4 {
    margin: 0 0 4px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${v.colorTexto};
  }

  .marca {
    gap: 14px;
    p {
      margin: 0;
      color: ${v.colorTextoSuave};
      font-size: 13px;
      line-height: 1.5;
      max-width: 260px;
    }
  }

  .isotipo {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    img {
      width: 70%;
    }
  }

  .dato {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${v.colorTextoSuave};
    font-size: 13.5px;
  }

  .redes {
    display: flex;
    gap: 10px;
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid ${v.borderSutil};
      font-size: 16px;
      &:hover {
        border-color: ${v.borderDorado};
      }
    }
  }

  .copyright {
    padding: 16px 24px;
    text-align: center;
    font-size: 12px;
    color: ${v.colorTextoSuave2};
    border-top: 1px solid ${v.borderSutil};
  }
`;
