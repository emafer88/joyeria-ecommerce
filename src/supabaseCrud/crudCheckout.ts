// Llamadas a las Edge Functions de pago (Fase 3). A diferencia de
// crudCatalogo.ts, esto NO son RPCs de Postgres: son funciones Deno que
// hablan con Mercado Pago y usan la service_role key server-side.
import { supabase } from "./supabase.config";
import type { CarritoItem, EnvioSnapshot } from "../types/dominio";

export interface ResultadoPreferencia {
  idOrdenExterna: string;
  initPoint: string;
}

/** Dirección para el checkout: id de una guardada, o los campos inline
 *  (guest / "otra dirección"). Coincide con lo que valida la Edge Function. */
export type EnvioCheckout =
  | { idDireccion: number }
  | {
      destinatario: string;
      telefono: string;
      cp: string;
      estado: string;
      municipio: string;
      colonia: string;
      calle: string;
      numeroExterior: string;
      numeroInterior: string | null;
      entreCalles: string | null;
      referencias: string | null;
      lat: number | null;
      lng: number | null;
    };

export interface ItemPedido {
  nombre: string;
  cantidad: number;
  precioVenta: number;
  total: number;
}

export interface EstadoPedido {
  estado: string;
  nroComprobante: string | null;
  montoTotal: number;
  items: ItemPedido[];
  envio: EnvioSnapshot | null;
}

function itemsParaEdgeFunction(items: CarritoItem[]) {
  return items.map((item) =>
    item.tipo === "pieza"
      ? { tipo: "pieza" as const, idPieza: item.idPieza }
      : {
          tipo: "stock" as const,
          idProducto: item.idProducto,
          cantidad: item.cantidad,
        }
  );
}

/** Extrae el mensaje real del body de error (la Edge Function responde
 * `{ error: "..." }`), en vez del genérico "non-2xx status code" que da
 * supabase-js por defecto. */
async function mensajeErrorEdgeFunction(error: unknown): Promise<string> {
  const conContexto = error as { context?: Response; message?: string };
  if (conContexto?.context) {
    try {
      const body = await conContexto.context.clone().json();
      if (body?.error) return body.error as string;
    } catch {
      // el body no era JSON, seguimos con el mensaje genérico
    }
  }
  return conContexto?.message ?? "Error desconocido";
}

export async function CrearPreferenciaPago(
  items: CarritoItem[],
  envio: EnvioCheckout
): Promise<ResultadoPreferencia> {
  const { data, error } = await supabase.functions.invoke(
    "crear-preferencia-pago",
    { body: { items: itemsParaEdgeFunction(items), envio } }
  );
  if (error) throw new Error(await mensajeErrorEdgeFunction(error));
  return data as ResultadoPreferencia;
}

export async function MostrarEstadoPedido(
  idOrdenExterna: string
): Promise<EstadoPedido> {
  const { data, error } = await supabase.functions.invoke("estado-pedido", {
    body: { idOrdenExterna },
  });
  if (error) throw new Error(await mensajeErrorEdgeFunction(error));
  return data as EstadoPedido;
}
