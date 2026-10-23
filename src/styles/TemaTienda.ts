import { createGlobalStyle } from "styled-components";
import type { PaletaTienda } from "../data/disenoTienda";

// Variables CSS de la paleta elegida en el admin. `variables.ts` y los estilos
// las usan en vez de colores fijos, así cambiar de paleta no re-renderiza nada.

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const luminancia = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Texto sobre botones del color principal: oscuro o blanco, el que más se lea.
const sobre = (hex: string) => {
  const l = luminancia(hex);
  const conOscuro = (l + 0.05) / 0.0623; // #1a1206
  const conBlanco = 1.05 / (l + 0.05);
  return conOscuro >= conBlanco ? "#1a1206" : "#ffffff";
};

export const TemaTienda = createGlobalStyle<{ $paleta: PaletaTienda }>`
  :root {
    --c-principal: ${({ $paleta }) => $paleta.principal};
    --c-principal-rgb: ${({ $paleta }) => rgb($paleta.principal)};
    --c-principal-oscuro: ${({ $paleta }) => $paleta.principalOscuro};
    --c-sobre-principal: ${({ $paleta }) => sobre($paleta.principal)};
    --c-secundario: ${({ $paleta }) => $paleta.secundario};
    --c-secundario-rgb: ${({ $paleta }) => rgb($paleta.secundario)};
    --c-fondo-1: ${({ $paleta }) => $paleta.fondo[0]};
    --c-fondo-2: ${({ $paleta }) => $paleta.fondo[1]};
    --c-fondo-3: ${({ $paleta }) => $paleta.fondo[2]};
    --c-fondo-rgb: ${({ $paleta }) => rgb($paleta.fondo[1])};
    --c-panel: ${({ $paleta }) => $paleta.panel};
    --c-texto: ${({ $paleta }) => $paleta.texto};
    --c-texto-rgb: ${({ $paleta }) => rgb($paleta.texto)};
  }
`;
