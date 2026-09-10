// Libreta de direcciones del comprador + lookup de código postal (MX).
//
// A diferencia de crudCatalogo (que nunca toca tablas directo porque no
// tienen RLS), `ecommerce_direccion` SÍ tiene RLS propia por user_id, así
// que el acceso directo `.from(...)` es seguro e idiomático.
import { supabase } from "./supabase.config";
import type {
  Direccion,
  DireccionInput,
  ResultadoCodigoPostal,
} from "../types/dominio";
import type { Database } from "../types/database.types";

type FilaDireccion = Database["public"]["Tables"]["ecommerce_direccion"]["Row"];

function aDireccion(f: FilaDireccion): Direccion {
  return {
    id: f.id,
    etiqueta: f.etiqueta,
    destinatario: f.destinatario,
    telefono: f.telefono,
    cp: f.cp,
    estado: f.estado,
    municipio: f.municipio,
    colonia: f.colonia,
    calle: f.calle,
    numeroExterior: f.numero_exterior,
    numeroInterior: f.numero_interior,
    entreCalles: f.entre_calles,
    referencias: f.referencias,
    lat: f.lat,
    lng: f.lng,
    esPredeterminada: f.es_predeterminada,
  };
}

function aFila(d: DireccionInput) {
  return {
    etiqueta: d.etiqueta?.trim() || null,
    destinatario: d.destinatario.trim(),
    telefono: d.telefono.trim(),
    cp: d.cp.trim(),
    estado: d.estado.trim(),
    municipio: d.municipio.trim(),
    colonia: d.colonia.trim(),
    calle: d.calle.trim(),
    numero_exterior: d.numeroExterior.trim(),
    numero_interior: d.numeroInterior?.trim() || null,
    entre_calles: d.entreCalles?.trim() || null,
    referencias: d.referencias?.trim() || null,
    lat: d.lat,
    lng: d.lng,
  };
}

async function idUsuario(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Necesitás iniciar sesión.");
  return data.user.id;
}

export async function MostrarDirecciones(): Promise<Direccion[]> {
  const { data, error } = await supabase
    .from("ecommerce_direccion")
    .select("*")
    .order("es_predeterminada", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(aDireccion);
}

export async function CrearDireccion(
  input: DireccionInput,
  hacerPredeterminada = false
): Promise<void> {
  const { error } = await supabase.from("ecommerce_direccion").insert({
    ...aFila(input),
    user_id: await idUsuario(),
    es_predeterminada: hacerPredeterminada,
  });
  if (error) throw new Error(error.message);
}

export async function EditarDireccion(
  id: number,
  input: DireccionInput
): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_direccion")
    .update(aFila(input))
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function EliminarDireccion(id: number): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_direccion")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function MarcarPredeterminada(id: number): Promise<void> {
  // El trigger ecommerce_direccion_predeterminada desmarca las demás.
  const { error } = await supabase
    .from("ecommerce_direccion")
    .update({ es_predeterminada: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function BuscarCodigoPostal(
  cp: string
): Promise<ResultadoCodigoPostal | null> {
  const { data, error } = await supabase.rpc("ecommerce_buscar_cp", {
    _cp: cp.trim(),
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return {
    estado: data[0].estado,
    municipio: data[0].municipio,
    ciudad: data[0].ciudad || null,
    colonias: data.map((r) => r.colonia),
  };
}
