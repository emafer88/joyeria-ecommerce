// Diseño editable de la tienda (empresa.diseno_tienda, se edita en el admin:
// Configuración → Diseño de la tienda). La base guarda solo lo que el dueño
// cambió; acá están los valores de fábrica y `normalizarDiseno` completa y
// limpia lo guardado, así que la tienda nunca depende de que venga completo.
// El editor del admin (proyecto-joyeria, src/utils/disenoTienda.jsx) repite
// ids, paletas y textos por defecto: mantenerlos iguales.

export type IdSeccion =
  | "banner"
  | "categorias"
  | "destacados"
  | "ofertas"
  | "nuevos"
  | "beneficios"
  | "redes";

export interface Seccion {
  id: IdSeccion;
  visible: boolean;
  titulo: string;
  subtitulo: string;
}

export type IconoBeneficio =
  | "envio"
  | "garantia"
  | "devolucion"
  | "pago"
  | "regalo"
  | "diamante"
  | "atencion"
  | "certificado";

export interface Beneficio {
  icono: IconoBeneficio;
  titulo: string;
  texto: string;
}

export interface Promo {
  etiqueta: string;
  titulo: string;
  texto: string;
  boton: string;
}

export interface Contacto {
  nombre: string;
  descripcion: string;
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface PaletaTienda {
  id: string;
  nombre: string;
  principal: string;
  principalOscuro: string;
  secundario: string;
  fondo: [string, string, string];
  panel: string;
  texto: string;
}

export interface DisenoTienda {
  paleta: string;
  secciones: Seccion[];
  promo: Promo;
  beneficios: Beneficio[];
  contacto: Contacto;
}

// Todas sobre fondo oscuro: el resto de la tienda (bordes y superficies
// translúcidas en blanco) está pensado para eso.
export const PALETAS_TIENDA: PaletaTienda[] = [
  {
    id: "clasica",
    nombre: "Oro y violeta",
    principal: "#f3d20c",
    principalOscuro: "#a9760a",
    secundario: "#9046ff",
    fondo: ["#1c1730", "#0b0a10", "#08070c"],
    panel: "#16151f",
    texto: "#f4f1e8",
  },
  {
    id: "oro-rosa",
    nombre: "Oro rosa",
    principal: "#e8b4a0",
    principalOscuro: "#a86b56",
    secundario: "#d0628c",
    fondo: ["#2c1a22", "#110b0e", "#0b0709"],
    panel: "#1d1418",
    texto: "#f6eee9",
  },
  {
    id: "plata",
    nombre: "Plata",
    principal: "#d7dde6",
    principalOscuro: "#8a94a4",
    secundario: "#7c93ff",
    fondo: ["#1b202b", "#0b0d12", "#07080b"],
    panel: "#141821",
    texto: "#eef1f5",
  },
  {
    id: "esmeralda",
    nombre: "Esmeralda",
    principal: "#34d399",
    principalOscuro: "#0f8a5f",
    secundario: "#e9c46a",
    fondo: ["#0f2a22", "#08110e", "#060b09"],
    panel: "#0f1d18",
    texto: "#effaf5",
  },
  {
    id: "zafiro",
    nombre: "Zafiro",
    principal: "#7cb4ff",
    principalOscuro: "#2f5fc4",
    secundario: "#c4b5fd",
    fondo: ["#13203d", "#090d18", "#06080f"],
    panel: "#111829",
    texto: "#eef3fb",
  },
  {
    id: "rubi",
    nombre: "Rubí",
    principal: "#fb7185",
    principalOscuro: "#be123c",
    secundario: "#f3d20c",
    fondo: ["#2d0f19", "#12080b", "#0b0507"],
    panel: "#1f0f14",
    texto: "#fbeff1",
  },
];

export const ICONOS_BENEFICIO: IconoBeneficio[] = [
  "envio",
  "garantia",
  "devolucion",
  "pago",
  "regalo",
  "diamante",
  "atencion",
  "certificado",
];

export const DISENO_FABRICA: DisenoTienda = {
  paleta: "clasica",
  secciones: [
    { id: "banner", visible: true, titulo: "", subtitulo: "" },
    { id: "categorias", visible: true, titulo: "Categorías", subtitulo: "" },
    {
      id: "destacados",
      visible: true,
      titulo: "Productos destacados",
      subtitulo: "Una selección de nuestras piezas favoritas",
    },
    {
      id: "ofertas",
      visible: true,
      titulo: "Ofertas",
      subtitulo: "Precio especial por tiempo limitado",
    },
    {
      id: "nuevos",
      visible: true,
      titulo: "Nuevos productos",
      subtitulo: "Lo último que llegó a la joyería",
    },
    { id: "beneficios", visible: true, titulo: "", subtitulo: "" },
    {
      id: "redes",
      visible: true,
      titulo: "Síguenos en redes",
      subtitulo: "Novedades, lanzamientos y detrás de escena de cada pieza.",
    },
  ],
  promo: {
    etiqueta: "Promociones",
    titulo: "Consulta nuestras ofertas de temporada",
    texto: "Piezas seleccionadas con condiciones especiales, todo el año.",
    boton: "Ver catálogo",
  },
  beneficios: [
    {
      icono: "envio",
      titulo: "Envío a todo México",
      texto: "Empaque seguro con seguimiento en cada pedido.",
    },
    {
      icono: "garantia",
      titulo: "Garantía en tus piezas",
      texto: "Respaldo en materiales y fabricación.",
    },
    {
      icono: "devolucion",
      titulo: "Devoluciones simples",
      texto: "Cambios y devoluciones sin complicaciones.",
    },
    {
      icono: "pago",
      titulo: "Pagos 100% seguros",
      texto: "Checkout protegido en cada compra.",
    },
  ],
  contacto: {
    nombre: "Cubiks Jewelry",
    descripcion: "Joyería en oro y plata, piezas pensadas para durar toda la vida.",
    telefono: "+52 55 0000 0000",
    whatsapp: "5215500000000",
    email: "contacto@cubiksjewelry.com",
    direccion: "Ciudad de México, México",
    instagram: "https://instagram.com/cubiksjewelry",
    facebook: "https://facebook.com/cubiksjewelry",
    tiktok: "",
  },
};

const MAX_TEXTO = 200;

const texto = (valor: unknown, defecto: string) =>
  typeof valor === "string" ? valor.trim().slice(0, MAX_TEXTO) : defecto;

// Solo enlaces http(s): nada de javascript: ni otros esquemas. Uno inválido
// queda vacío (no se muestra), no vuelve al de fábrica.
const url = (valor: unknown, defecto: string) => {
  if (typeof valor !== "string") return defecto;
  const limpio = valor.trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(limpio) ? limpio.slice(0, 300) : "";
};

const obj = (valor: unknown): Record<string, unknown> =>
  valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};

export function normalizarDiseno(guardado: unknown): DisenoTienda {
  const g = obj(guardado);
  const f = DISENO_FABRICA;

  const paleta = PALETAS_TIENDA.some((p) => p.id === g.paleta)
    ? (g.paleta as string)
    : f.paleta;

  // Orden guardado con los ids conocidos, sin repetir; las secciones que no
  // vengan (p. ej. una nueva en una versión futura) se agregan al final.
  const vistos = new Set<IdSeccion>();
  const secciones: Seccion[] = [];
  for (const crudo of Array.isArray(g.secciones) ? g.secciones : []) {
    const s = obj(crudo);
    const base = f.secciones.find((d) => d.id === s.id);
    if (!base || vistos.has(base.id)) continue;
    vistos.add(base.id);
    secciones.push({
      id: base.id,
      visible: typeof s.visible === "boolean" ? s.visible : true,
      titulo: texto(s.titulo, base.titulo),
      subtitulo: texto(s.subtitulo, base.subtitulo),
    });
  }
  for (const base of f.secciones) {
    if (!vistos.has(base.id)) secciones.push({ ...base });
  }

  const p = obj(g.promo);
  const promo: Promo = {
    etiqueta: texto(p.etiqueta, f.promo.etiqueta),
    titulo: texto(p.titulo, f.promo.titulo),
    texto: texto(p.texto, f.promo.texto),
    boton: texto(p.boton, f.promo.boton),
  };

  const beneficiosGuardados = Array.isArray(g.beneficios) ? g.beneficios : null;
  const beneficios: Beneficio[] = beneficiosGuardados
    ? beneficiosGuardados.slice(0, 4).map((crudo) => {
        const b = obj(crudo);
        return {
          icono: ICONOS_BENEFICIO.includes(b.icono as IconoBeneficio)
            ? (b.icono as IconoBeneficio)
            : "diamante",
          titulo: texto(b.titulo, ""),
          texto: texto(b.texto, ""),
        };
      })
    : f.beneficios.map((b) => ({ ...b }));

  const c = obj(g.contacto);
  const contacto: Contacto = {
    nombre: texto(c.nombre, f.contacto.nombre),
    descripcion: texto(c.descripcion, f.contacto.descripcion),
    telefono: texto(c.telefono, f.contacto.telefono),
    whatsapp:
      typeof c.whatsapp === "string"
        ? c.whatsapp.replace(/\D/g, "").slice(0, 15)
        : f.contacto.whatsapp,
    email: texto(c.email, f.contacto.email),
    direccion: texto(c.direccion, f.contacto.direccion),
    instagram: url(c.instagram, f.contacto.instagram),
    facebook: url(c.facebook, f.contacto.facebook),
    tiktok: url(c.tiktok, f.contacto.tiktok),
  };

  return { paleta, secciones, promo, beneficios, contacto };
}

export const paletaTienda = (id: string) =>
  PALETAS_TIENDA.find((p) => p.id === id) ?? PALETAS_TIENDA[0];
