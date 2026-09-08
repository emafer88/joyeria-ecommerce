import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCantidadCarrito } from "../../store/CarritoStore";
import { useAuthStore, nombreVisible } from "../../store/AuthStore";
import { CerrarSesion } from "../../supabaseCrud/crudAuth";
import { v } from "../../styles/variables";
import logo from "../../assets/logo.png";

export function Header() {
  const cantidad = useCantidadCarrito();
  const user = useAuthStore((s) => s.user);
  const cargando = useAuthStore((s) => s.cargando);
  const navigate = useNavigate();

  const salir = async () => {
    try {
      await CerrarSesion();
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Container>
      <Link className="marca" to="/">
        <span className="isotipo">
          <img src={logo} alt="Cubiks Jewelry" />
        </span>
        <span className="nombre">CUBIKS JEWELRY</span>
      </Link>

      <nav>
        {!cargando &&
          (user ? (
            <div className="cuenta">
              <Link className="mis-pedidos" to="/mis-pedidos">
                {nombreVisible(user)}
              </Link>
              <button type="button" className="salir" onClick={salir}>
                Salir
              </button>
            </div>
          ) : (
            <Link className="ingresar" to="/acceso">
              Ingresar
            </Link>
          ))}

        <Link className="carrito" to="/carrito">
          Carrito{cantidad > 0 ? ` (${cantidad})` : ""}
        </Link>
      </nav>
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

  nav {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cuenta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mis-pedidos {
    font-size: 13px;
    color: ${v.colorTextoSuave};
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: 0.2s;
    &:hover {
      color: ${v.colorPrincipal};
    }
  }

  .salir {
    background: none;
    border: none;
    color: ${v.colorTextoSuave2};
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    padding: 4px;
    transition: 0.2s;
    &:hover {
      color: ${v.colorTexto};
    }
  }

  .ingresar {
    font-size: 13.5px;
    color: ${v.colorTextoSuave};
    transition: 0.2s;
    &:hover {
      color: ${v.colorPrincipal};
    }
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
