import { useState } from "react";
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  const salir = async () => {
    setMenuAbierto(false);
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
              <button
                type="button"
                className="disparador"
                onClick={() => setMenuAbierto((a) => !a)}
              >
                {nombreVisible(user)} ▾
              </button>
              {menuAbierto && (
                <>
                  <div
                    className="backdrop"
                    onClick={() => setMenuAbierto(false)}
                  />
                  <div className="menu">
                    <Link to="/mis-pedidos" onClick={() => setMenuAbierto(false)}>
                      Mis pedidos
                    </Link>
                    <Link
                      to="/mis-direcciones"
                      onClick={() => setMenuAbierto(false)}
                    >
                      Mis direcciones
                    </Link>
                    <button type="button" onClick={salir}>
                      Salir
                    </button>
                  </div>
                </>
              )}
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
    position: relative;
  }

  .disparador {
    background: none;
    border: none;
    color: ${v.colorTextoSuave};
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: 0.2s;
    &:hover {
      color: ${v.colorPrincipal};
    }
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
  }

  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 21;
    min-width: 170px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid ${v.borderSutil};
    background: #14121c;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);

    a,
    button {
      text-align: left;
      padding: 9px 12px;
      border-radius: 8px;
      background: none;
      border: none;
      color: ${v.colorTextoSuave};
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      transition: 0.15s;
      &:hover {
        background: ${v.bgTarjetaHover};
        color: ${v.colorPrincipal};
      }
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
