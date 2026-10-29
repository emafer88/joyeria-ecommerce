import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";
import type { Banner } from "../../types/dominio";
import { useGiro } from "../../tanstack/LicenciaStack";

// Slides de respaldo: se usan mientras no haya banners cargados desde el
// admin (proyecto-joyeria → Configuración → Diseño de la tienda → Banners), o
// si esa carga falla. Una joyería habla de piezas; los demás giros, de
// productos.
const FONDOS = [
  "linear-gradient(135deg, rgba(var(--c-secundario-rgb), 0.28) 0%, var(--c-fondo-2) 70%)",
  "linear-gradient(135deg, rgba(var(--c-principal-rgb), 0.2) 0%, var(--c-fondo-2) 70%)",
  "linear-gradient(135deg, rgba(var(--c-secundario-rgb), 0.18) 0%, var(--c-fondo-1) 30%, var(--c-fondo-2) 70%)",
];

const SLIDES_GENERAL = [
  {
    fondo: FONDOS[0],
    etiqueta: "Bienvenido",
    titulo: "Descubre nuestro catálogo",
    texto: "Encuentra lo que buscas y recíbelo en casa.",
    link: "/catalogo",
  },
  {
    fondo: FONDOS[1],
    etiqueta: "Envíos a todo México",
    titulo: "Recibe tu pedido en la puerta de tu casa",
    texto: "Empaque seguro y seguimiento en cada pedido.",
    link: "/catalogo",
  },
  {
    fondo: FONDOS[2],
    etiqueta: "Compra segura",
    titulo: "Paga con total confianza",
    texto: "Checkout protegido en cada compra.",
    link: "/catalogo",
  },
];

const SLIDES_JOYERIA = [
  {
    fondo: FONDOS[0],
    etiqueta: "Nueva colección",
    titulo: "Piezas únicas en oro y plata",
    texto: "Diseños atemporales, hechos para durar toda la vida.",
    link: "/catalogo",
  },
  {
    fondo: FONDOS[1],
    etiqueta: "Envíos a todo México",
    titulo: "Recibe tu joya en la puerta de tu casa",
    texto: "Empaque seguro y seguimiento en cada pedido.",
    link: "/catalogo",
  },
  {
    fondo: FONDOS[2],
    etiqueta: "Compra segura",
    titulo: "Paga con total confianza",
    texto: "Checkout protegido y garantía en todas nuestras piezas.",
    link: "/catalogo",
  },
];

interface Slide {
  fondo: string;
  /** Foto con oscurecido: el texto va blanco aunque la paleta sea clara. */
  sobreImagen?: boolean;
  etiqueta?: string;
  titulo: string;
  texto?: string;
  link: string;
}

const INTERVALO_MS = 5500;

function aSlides(banners: Banner[] | undefined, giro: string | undefined): Slide[] {
  if (!banners || banners.length === 0) {
    return giro === "joyeria" ? SLIDES_JOYERIA : SLIDES_GENERAL;
  }
  return banners.map((b) => ({
    fondo: `linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,.25)), url(${b.imagenUrl}) center / cover`,
    sobreImagen: true,
    titulo: b.titulo,
    texto: b.subtitulo ?? undefined,
    link: b.linkDestino ?? "/catalogo",
  }));
}

interface Props {
  banners?: Banner[];
}

export function BannerHero({ banners }: Props) {
  const giro = useGiro();
  const slides = aSlides(banners, giro);
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
      className={slide.sobreImagen ? "sobre-imagen" : undefined}
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

  &.sobre-imagen {
    h1 {
      color: #fff;
    }
    p {
      color: rgba(255, 255, 255, 0.85);
    }
    .puntos button:not(.activo) {
      background: rgba(255, 255, 255, 0.35);
    }
  }

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
    color: var(--c-sobre-principal);
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
      background: rgba(var(--c-capa-rgb), 0.25);
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
