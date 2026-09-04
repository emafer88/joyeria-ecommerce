import styled from "styled-components";
import { Link } from "react-router-dom";
import { useCantidadCarrito } from "../../store/CarritoStore";
import { v } from "../../styles/variables";
import logo from "../../assets/logo.png";

export function Header() {
  const cantidad = useCantidadCarrito();

  return (
    <Container>
      <Link className="marca" to="/">
        <span className="isotipo">
          <img src={logo} alt="Cubiks Jewelry" />
        </span>
        <span className="nombre">CUBIKS JEWELRY</span>
      </Link>
      <Link className="carrito" to="/carrito">
        Carrito{cantidad > 0 ? ` (${cantidad})` : ""}
      </Link>
    </Container>
  );
}

const Container = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(10, 9, 15, 0.75);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${v.borderSutil};

  a {
    text-decoration: none;
    color: inherit;
  }

  .marca {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .isotipo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    img {
      width: 70%;
    }
  }

  .nombre {
    font-weight: 700;
    letter-spacing: 0.5px;
    font-size: 13px;
  }

  .carrito {
    padding: 8px 18px;
    border-radius: 30px;
    border: 1px solid ${v.borderDorado};
    background: rgba(243, 210, 12, 0.1);
    color: ${v.colorPrincipal};
    font-weight: 600;
    font-size: 13.5px;
    transition: 0.2s;
    &:hover {
      background: rgba(243, 210, 12, 0.18);
    }
  }
`;
