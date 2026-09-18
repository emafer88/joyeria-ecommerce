import styled from "styled-components";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/AuthStore";
import { useFavoritosQuery } from "../tanstack/FavoritosStack";
import { TarjetaProducto } from "../components/organismos/TarjetaProducto";
import { v } from "../styles/variables";

export function MisFavoritos() {
  const session = useAuthStore((s) => s.session);
  const { data, isLoading, isError, error } = useFavoritosQuery(!!session);

  return (
    <Container>
      <span className="etiqueta">Tu cuenta</span>
      <h1>Mis favoritos</h1>

      {isLoading && <p>Cargando…</p>}
      {isError && (
        <p className="error">
          No se pudieron cargar tus favoritos: {(error as Error).message}
        </p>
      )}
      {data && data.length === 0 && (
        <p>
          Todavía no tenés favoritos.{" "}
          <Link to="/catalogo">Ir al catálogo</Link>
        </p>
      )}

      {data && data.length > 0 && (
        <div className="grilla">
          {data.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 60px;

  a {
    color: ${v.colorPrincipal};
  }

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 24px;
    font-size: 28px;
  }

  .error {
    color: #ff8a80;
  }

  .grilla {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(2, 1fr);
    @media (min-width: 576px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (min-width: 992px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }
`;
