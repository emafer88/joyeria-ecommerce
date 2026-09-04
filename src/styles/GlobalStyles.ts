import { createGlobalStyle } from "styled-components";
import { v } from "./variables";

// Misma identidad que las páginas públicas del POS: fondo oscuro degradado,
// dorado/violeta como acento, tipografía Poppins.
export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    font-family: "Poppins", sans-serif;
    background: ${v.bgFondo};
    background-attachment: fixed;
    color: ${v.colorTexto};
  }
  a {
    color: inherit;
  }
  ::selection {
    background: ${v.colorPrincipal};
    color: #1a1206;
  }
  body::-webkit-scrollbar {
    width: 12px;
    background: rgba(24, 24, 24, 0.2);
  }
  body::-webkit-scrollbar-thumb {
    background: rgba(148, 148, 148, 0.6);
    border-radius: 10px;
  }
`;
