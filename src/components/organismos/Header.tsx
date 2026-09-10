import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FiSearch } from "react-icons/fi";
import { useCantidadCarrito } from "../../store/CarritoStore";
import { useAuthStore, nombreVisible } from "../../store/AuthStore";
import { useFiltrosCatalogoStore } from "../../store/FiltrosCatalogoStore";
import { CerrarSesion } from "../../supabaseCrud/crudAuth";
import { v } from "../../styles/variables";
import logo from "../../assets/logo.png";

export function Header() {
  const cantidad = useCantidadCarrito();
  const user = useAuthStore((s) => s.user);
  const cargando = useAuthStore((s) => s.cargando);
  const setBuscador = useFiltrosCatalogoStore((s) => s.setBuscador);
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    setBuscador(busqueda.trim() || null);
    navigate("/catalogo");
  };

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

      <nav className="enlaces">
        <Link to="/">Inicio</Link>
        <Link to="/catalogo">Catálogo</Link>
      </nav>

      <form className="buscador" onSubmit={buscar}>
        <input
          type="search"
          placeholder="Buscar joyas..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="submit" aria-label="Buscar">
          <FiSearch />
        </button>
      </form>

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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
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

  .enlaces {
    display: flex;
    align-items: center;
    gap: 18px;
    order: 3;
    width: 100%;
    @media (min-width: 860px) {
      order: 0;
      width: auto;
    }

    a {
      font-size: 13.5px;
      color: ${v.colorTextoSuave};
      transition: 0.2s;
      &:hover {
        color: ${v.colorPrincipal};
      }
    }
  }

  .buscador {
    display: flex;
    align-items: center;
    flex: 1 1 200px;
    max-width: 320px;
    order: 4;
    @media (min-width: 860px) {
      order: 0;
    }

    input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 20px 0 0 20px;
      border: 1px solid ${v.borderSutil};
      border-right: none;
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTexto};
      font-size: 13px;
      font-family: inherit;
      &::placeholder {
        color: ${v.colorTextoSuave2};
      }
      &:focus {
        outline: none;
        border-color: ${v.borderDorado};
      }
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      border-radius: 0 20px 20px 0;
      border: 1px solid ${v.borderSutil};
      border-left: none;
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTextoSuave};
      cursor: pointer;
      transition: 0.2s;
      &:hover {
        color: ${v.colorPrincipal};
      }
    }
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
