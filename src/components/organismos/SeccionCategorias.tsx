import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { GiGemPendant } from "react-icons/gi";
import { FiTag } from "react-icons/fi";
import { useCategoriasQuery } from "../../tanstack/CatalogoStack";
import { urlFiltros } from "../../hooks/useFiltrosUrl";
import { v } from "../../styles/variables";
import { useGiro } from "../../tanstack/LicenciaStack";

// `categorias.icono` en la base es "-" (sin ícono) o la URL pública de una
// imagen subida desde el admin (ver crudCategorias.jsx → subirImagen). No es
// un emoji/glifo corto: hay que renderizarlo como <img>, no como texto.
const esUrlImagen = (icono: string) => /^https?:\/\//.test(icono);

export function SeccionCategorias({ titulo }: { titulo: string }) {
  const { data: categorias, isLoading } = useCategoriasQuery();
  const navigate = useNavigate();
  // Sin imagen: un dije en joyería, una etiqueta en los demás giros.
  const IconoRespaldo = useGiro() === "joyeria" ? GiGemPendant : FiTag;

  if (isLoading || !categorias || categorias.length === 0) return null;

  const ir = (idCategoria: number) => {
    navigate(`/catalogo${urlFiltros({ categorias: [idCategoria] })}`);
  };

  return (
    <Container>
      {titulo && <h2>{titulo}</h2>}
      <div className="grilla">
        {categorias.map((c) => (
          <button
            type="button"
            key={c.id}
            className="tarjeta"
            style={c.color ? { borderColor: `${c.color}66` } : undefined}
            onClick={() => ir(c.id)}
          >
            <span
              className="icono"
              style={c.color ? { background: `${c.color}22`, color: c.color } : undefined}
            >
              {c.icono && esUrlImagen(c.icono) ? (
                <img src={c.icono} alt="" />
              ) : (
                <IconoRespaldo />
              )}
            </span>
            <span className="nombre">{c.nombre}</span>
          </button>
        ))}
      </div>
    </Container>
  );
}

const Container = styled.section`
  max-width: 1180px;
  margin: 0 auto;
  padding: 50px 24px 10px;

  h2 {
    margin: 0 0 20px;
    font-size: 22px;
  }

  .grilla {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    @media (min-width: 576px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (min-width: 900px) {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  .tarjeta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 12px;
    border-radius: ${v.borderRadius};
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTexto};
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    &:hover {
      transform: translateY(-3px);
      background: ${v.bgTarjetaHover};
      border-color: ${v.borderDorado};
    }
  }

  .icono {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(var(--c-principal-rgb), 0.12);
    color: ${v.colorPrincipal};
    font-size: 20px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .nombre {
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }
`;
