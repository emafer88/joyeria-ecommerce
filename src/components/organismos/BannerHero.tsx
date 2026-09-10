import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";
import type { Banner } from "../../types/dominio";

// Slides de respaldo: se usan mientras no haya banners cargados desde el
// admin (proyecto-joyeria → Productos → Banners), o si esa carga falla.
const SLIDES_RESPALDO = [
  {
    fondo: "linear-gradient(135deg, #2a1f45 0%, #0b0a10 70%)",
    etiqueta: "Colección Cubiks",
    titulo: "Piezas únicas en oro y plata",
    texto: "Diseños atemporales, hechos para durar toda la vida.",
    link: "/catalogo",
  },
  {
    fondo: "linear-gradient(135deg, #3a2f0a 0%, #0b0a10 70%)",
    etiqueta: "Envíos a todo México",
    titulo: "Recibí tu joya en la puerta de tu casa",
    texto: "Empaque seguro y seguimiento en cada pedido.",
    link: "/catalogo",
  },
  {
    fondo: "linear-gradient(135deg, #401f3d 0%, #0b0a10 70%)",
    etiqueta: "Compra segura",
    titulo: "Pagá con total confianza",
    texto: "Checkout protegido y garantía en todas nuestras piezas.",
    link: "/catalogo",
  },
];

interface Slide {
  fondo: string;
  etiqueta?: string;
  titulo: string;
  texto?: string;
  link: string;
}

const INTERVALO_MS = 5500;

function aSlides(banners: Banner[] | undefined): Slide[] {
  if (!banners || banners.length === 0) return SLIDES_RESPALDO;
  return banners.map((b) => ({
    fondo: `linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,.25)), url(${b.imagenUrl}) center / cover`,
    titulo: b.titulo,
    texto: b.subtitulo ?? undefined,
    link: b.linkDestino ?? "/catalogo",
  }));
}

interface Props {
  banners?: Banner[];
}

export function BannerHero({ banners }: Props) {
  const slides = aSlides(banners);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Si cambia la cantidad de slides (llegan los banners reales después del
  // placeholder), este índice puede apuntar afuera: se acota acá en vez de
  // resetear el state desde un efecto.
  const activo = indice < slides.length ? indice : 0;

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setInterval(
      () => setIndice((i) => (i + 1) % slides.length),
      INTERVALO_MS
    );
    return () => clearInterval(t);
  }, [pausado, slides.length]);

  const slide = slides[activo];

  return (
    <Container
      style={{ background: slide.fondo }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="contenido">
        {slide.etiqueta && <span className="etiqueta">{slide.etiqueta}</span>}
        <h1>{slide.titulo}</h1>
        {slide.texto && <p>{slide.texto}</p>}
        <Link className="cta" to={slide.link}>
          Ver catálogo
        </Link>
      </div>

      {slides.length > 1 && (
        <div className="puntos">
          {slides.map((s, i) => (
            <button
              key={s.titulo}
              type="button"
              className={i === activo ? "activo" : ""}
              aria-label={`Ver banner ${i + 1}`}
              onClick={() => setIndice(i)}
            />
          ))}
        </div>
      )}
    </Container>
  );
}

const Container = styled.section`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 60px 24px;
  overflow: hidden;
  border-bottom: 1px solid ${v.borderSutil};
  transition: background 0.6s ease;

  .contenido {
    max-width: 560px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  h1 {
    margin: 4px 0;
    font-size: clamp(26px, 4vw, 40px);
    line-height: 1.2;
  }

  p {
    margin: 0 0 12px;
    color: ${v.colorTextoSuave};
    font-size: 15px;
  }

  .cta {
    padding: 12px 26px;
    border-radius: 30px;
    border: 1px solid ${v.borderDorado};
    background: ${v.colorPrincipal};
    color: #1a1206;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition: 0.2s;
    &:hover {
      filter: brightness(1.08);
    }
  }

  .puntos {
    position: absolute;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;

    button {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: none;
      padding: 0;
      background: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: 0.2s;
      &.activo {
        background: ${v.colorPrincipal};
        width: 20px;
        border-radius: 4px;
      }
    }
  }
`;
