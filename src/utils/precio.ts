// Helpers puros de precio/descuento, compartidos entre la tarjeta del catálogo
// y la página de detalle.

/**
 * Porcentaje de descuento (entero, ej. 25 para "-25%") entre el precio base y
 * el precio de oferta. Devuelve null si no hay una oferta válida (precio de
 * oferta nulo, base <= 0, o la "oferta" no es más barata que el precio base).
 */
export function porcentajeDescuento(
  precioBase: number,
  precioOferta: number | null
): number | null {
  if (precioOferta === null || precioBase <= 0 || precioOferta >= precioBase) {
    return null;
  }
  return Math.round((1 - precioOferta / precioBase) * 100);
}
