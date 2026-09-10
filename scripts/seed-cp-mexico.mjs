// Seed de la tabla `cp_mexico` con el dataset oficial de códigos postales de
// México (SEPOMEX / Correos de México).
//
// De dónde bajar el archivo:
//   https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx
//   (o cualquier mirror del "CPdescarga.txt"). Es un .txt delimitado por "|",
//   codificado en Latin-1, con una línea de preámbulo antes del header real.
//
// Uso:
//   node scripts/seed-cp-mexico.mjs ./CPdescarga.txt
//
// La URL y la service_role key se leen de variables de entorno o, si no
// están, de .env (SUPABASE_URL / VITE_APP_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY). La service_role va en .env sin prefijo VITE_,
// así que Vite NO la expone al frontend, y .env está en .gitignore.
// Idempotente: hace upsert ignorando duplicados por (cp, colonia).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Falta la ruta al CSV. Uso: node scripts/seed-cp-mexico.mjs ./CPdescarga.txt");
  process.exit(1);
}

function leerEnv(clave) {
  if (process.env[clave]) return process.env[clave];
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const linea = env.split(/\r?\n/).find((l) => l.startsWith(`${clave}=`));
    return linea ? linea.slice(clave.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  leerEnv("SUPABASE_URL") ??
  leerEnv("VITE_APP_SUPABASE_URL");
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  leerEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// El .txt viene en Latin-1.
const crudo = readFileSync(CSV_PATH, "latin1");
const lineas = crudo.split(/\r?\n/).filter(Boolean);

const idxHeader = lineas.findIndex((l) => l.toLowerCase().includes("d_codigo"));
if (idxHeader === -1) {
  console.error("No se encontró el header (línea con 'd_codigo').");
  process.exit(1);
}

const header = lineas[idxHeader].split("|").map((h) => h.trim());
const col = (nombre) => header.indexOf(nombre);
const iCp = col("d_codigo");
const iColonia = col("d_asenta");
const iTipo = col("d_tipo_asenta");
const iMunicipio = col("D_mnpio");
const iEstado = col("d_estado");
const iCiudad = col("d_ciudad");
const iZona = col("d_zona");

const limpio = (s) => (s ?? "").trim() || null;

const vistos = new Set();
const filas = [];
for (const linea of lineas.slice(idxHeader + 1)) {
  const p = linea.split("|");
  const cp = limpio(p[iCp]);
  const colonia = limpio(p[iColonia]);
  if (!cp || !colonia) continue;
  const clave = `${cp}|${colonia}`;
  if (vistos.has(clave)) continue;
  vistos.add(clave);
  filas.push({
    cp,
    colonia,
    tipo_asentamiento: limpio(p[iTipo]),
    municipio: limpio(p[iMunicipio]) ?? "",
    estado: limpio(p[iEstado]) ?? "",
    ciudad: iCiudad === -1 ? null : limpio(p[iCiudad]),
    zona: iZona === -1 ? null : limpio(p[iZona]),
  });
}

console.log(`Parseadas ${filas.length} filas (cp, colonia) únicas. Insertando...`);

const LOTE = 1000;
let insertadas = 0;
for (let i = 0; i < filas.length; i += LOTE) {
  const lote = filas.slice(i, i + LOTE);
  const { error } = await supabase
    .from("cp_mexico")
    .upsert(lote, { onConflict: "cp,colonia", ignoreDuplicates: true });
  if (error) {
    console.error(`Error en el lote ${i}-${i + lote.length}:`, error.message);
    process.exit(1);
  }
  insertadas += lote.length;
  if (i % (LOTE * 10) === 0) console.log(`  ${insertadas}/${filas.length}`);
}

console.log(`Listo. ${insertadas} filas procesadas.`);
