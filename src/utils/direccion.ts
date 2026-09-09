// Helpers puros de direcciones, compartidos entre páginas y componentes.

interface PartesDireccion {
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  colonia: string;
  municipio: string;
  estado: string;
  cp: string;
}

/** Una línea legible: "Calle 123 int. 4, Colonia, Municipio, Estado, CP 00000". */
export function lineaDireccion(d: PartesDireccion): string {
  const int = d.numeroInterior ? ` int. ${d.numeroInterior}` : "";
  return `${d.calle} ${d.numeroExterior}${int}, ${d.colonia}, ${d.municipio}, ${d.estado}, CP ${d.cp}`;
}
