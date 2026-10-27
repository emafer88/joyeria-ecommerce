// Rangos de precio ya armados ("Menos de $500", "$500 – $1,000"...) a partir
// del precio mínimo y máximo de lo que se está viendo, con cortes en números
// redondos (1, 2, 2.5 o 5 por potencia de 10).

export interface RangoPrecio {
  min: number | null;
  max: number | null;
  texto: string;
}

function redondo(x: number): number {
  if (x <= 0) return 0;
  const pot = 10 ** Math.floor(Math.log10(x));
  const f = x / pot;
  const paso = f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10;
  return paso * pot;
}

const dinero = (n: number) => `$${n.toLocaleString("es-MX")}`;

export function rangosPrecio(
  min: number | null,
  max: number | null
): RangoPrecio[] {
  if (min === null || max === null || max <= min) return [];
  // Cortes en pesos enteros: con precios casi iguales no hay rangos.
  const paso = Math.max(redondo((max - min) / 4), 1);
  const cortes: number[] = [];
  for (let c = Math.ceil(min / paso) * paso; c < max; c += paso) {
    if (c > min) cortes.push(c);
  }
  if (cortes.length === 0) return [];
  const rangos: RangoPrecio[] = [
    { min: null, max: cortes[0], texto: `Menos de ${dinero(cortes[0])}` },
  ];
  for (let i = 0; i < cortes.length - 1; i++) {
    rangos.push({
      min: cortes[i],
      max: cortes[i + 1],
      texto: `${dinero(cortes[i])} – ${dinero(cortes[i + 1])}`,
    });
  }
  const ultimo = cortes[cortes.length - 1];
  rangos.push({ min: ultimo, max: null, texto: `Más de ${dinero(ultimo)}` });
  return rangos;
}
