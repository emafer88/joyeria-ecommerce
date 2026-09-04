// Constantes fijas del ecommerce (una sola empresa/sucursal/almacén reales
// hoy). Backlog: panel de admin para hacerlo configurable (ver plan).
export const ID_EMPRESA = 1;
export const ID_SUCURSAL = 1;
export const ID_ALMACEN = 1;
export const ID_TIPO_COMPROBANTE = 2; // Boleta
export const SERIE = "WEB";
export const CANAL = "ecommerce";

// Ventana de reserva antes de considerar un pedido abandonado (usada por
// liberar-reservas-vencidas). No hay TTL nativo en la base, se controla acá.
export const MINUTOS_RESERVA = 30;
