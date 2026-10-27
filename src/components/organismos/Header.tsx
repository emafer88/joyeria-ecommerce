import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FiSearch } from "react-icons/fi";
import { useCantidadCarrito } from "../../store/CarritoStore";
import { useAuthStore, nombreVisible } from "../../store/AuthStore";
import { urlFiltros } from "../../hooks/useFiltrosUrl";
import { useFuncionesGiro } from "../../tanstack/LicenciaStack";
import { useDiseno } from "../../tanstack/DisenoStack";
import { CerrarSesion } from "../../supabaseCrud/crudAuth";
import { v } from "../../styles/variables";
import logo from "../../assets/logo.png";

export function Header() {
  const cantidad = useCantidadCarrito();
  const user = useAuthStore((s) => s.user);
  const cargando = useAuthStore((s) => s.cargando);
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const conPiezas = useFuncionesGiro().tiene("piezas");
  // El nombre de la tienda sale de Diseño de la tienda → Contacto.
  const { contacto } = useDiseno();
  const [busqueda, setBusqueda] = useState("");

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/catalogo${urlFiltros({ buscador: busqueda.trim() || null })}`);
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
          <img src={logo} alt={contacto.nombre} />
        </span>
        <span className="nombre">{contacto.nombre.toUpperCase()}</span>
      </Link>

      <nav className="enlaces">
        <Link to="/">Inicio</Link>
        <Link to="/catalogo">Catálogo</Link>
      </nav>

      <form className="buscador" onSubmit={buscar}>
        <input
          type="search"
          placeholder={conPiezas ? "Buscar joyas..." : "Buscar productos..."}
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
                    <Link to="/mi-perfil" onClick={() => setMenuAbierto(false)}>
                      Mi perfil
                    </Link>
                    <Link to="/mis-pedidos" onClick={() => setMenuAbierto(false)}>
                      Mis pedidos
                    </Link>
                    <Link
                      to="/mis-direcciones"
                      onClick={() => setMenuAbierto(false)}
                    >
                      Mis direcciones
                    </Link>
                    <Link
                      to="/mis-favoritos"
                      onClick={() => setMenuAbierto(false)}
                    >
                      Mis favoritos
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
  background: rgba(var(--c-fondo-rgb), 0.75);
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
      background: rgba(var(--c-capa-rgb), 0.03);
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
      background: rgba(var(--c-capa-rgb), 0.03);
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
    background: rgba(var(--c-principal-rgb), 0.1);
    color: ${v.colorPrincipal};
    font-weight: 600;
    font-size: 13.5px;
    white-space: nowrap;
    transition: 0.2s;
    &:hover {
      background: rgba(var(--c-principal-rgb), 0.18);
    }
  }

  /* Celular: dos renglones (marca + cuenta/carrito; enlaces + buscador).
     Es sticky, así que cada renglón de más le quita pantalla al contenido. */
  @media (max-width: 859.98px) {
    flex-wrap: wrap;
    gap: 0 12px;
    padding: 10px 16px;

    /* Salto de renglón forzado entre marca/cuenta (order 0) y
       enlaces/buscador (order 3 y 4); su alto hace de separación. */
    &::before {
      content: "";
      order: 2;
      flex-basis: 100%;
      height: 10px;
    }

    .marca {
      min-width: 0;
      gap: 8px;
    }
    .nombre {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .enlaces {
      width: auto;
      gap: 14px;
    }
    .buscador {
      flex: 1 1 0;
      max-width: none;
      min-width: 0;
    }
    nav {
      gap: 10px;
    }
    .disparador {
      max-width: 110px;
    }
    .carrito {
      padding: 6px 12px;
    }
  }
`;
