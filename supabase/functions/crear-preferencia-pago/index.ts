// Recibe el carrito, revalida todo server-side (nunca confía en precios que
// mande el navegador), reserva las piezas de joyería, guarda las líneas de
// producto por cantidad, y crea la preferencia de pago en Mercado Pago.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, json, respuestaCors } from "../_shared/cors.ts";
import {
  CANAL,
  ID_ALMACEN,
  ID_EMPRESA,
  ID_SUCURSAL,
} from "../_shared/constantes.ts";

const MONEDA = "MXN";

interface ItemPiezaRequest {
  tipo: "pieza";
  idPieza: number;
}
interface ItemStockRequest {
  tipo: "stock";
  idProducto: number;
  cantidad: number;
}
type ItemRequest = ItemPiezaRequest | ItemStockRequest;

interface LineaValidada {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioVenta: number;
  precioCompra: number | null;
  idPieza?: number;
}

async function anularVenta(idVenta: number, idOrdenExterna: string) {
  const { data: piezas } = await supabaseAdmin
    .from("piezas_inventario")
    .select("id")
    .eq("id_venta_reserva", idVenta)
    .eq("estado", "reservada");

  for (const p of piezas ?? []) {
    await supabaseAdmin.rpc("liberar_pieza", {
      _id_pieza: p.id,
      _id_empresa: ID_EMPRESA,
      _id_usuario: null,
    });
  }

  await supabaseAdmin.from("ventas").update({ estado: "anulada" }).eq("id", idVenta);
  await supabaseAdmin
    .from("ecommerce_orden_items")
    .delete()
    .eq("origen", CANAL)
    .eq("id_orden_externa", idOrdenExterna);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respuestaCors();
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  let body: { items?: ItemRequest[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "body inválido" }, 400);
  }

  const items = body.items ?? [];
  if (items.length === 0) return json({ error: "el carrito está vacío" }, 400);

  // --- 1) Revalidar cada línea contra la base real (nunca el precio del cliente) ---
  const lineas: LineaValidada[] = [];
  const fallidas: string[] = [];

  for (const item of items) {
    if (item.tipo === "pieza") {
      const { data: pieza } = await supabaseAdmin
        .from("piezas_inventario")
        .select("id, id_producto, precio_venta, costo, estado, productos(nombre)")
        .eq("id", item.idPieza)
        .eq("id_empresa", ID_EMPRESA)
        .maybeSingle();

      if (!pieza || pieza.estado !== "disponible") {
        fallidas.push(`pieza:${item.idPieza}`);
        continue;
      }
      lineas.push({
        idProducto: pieza.id_producto,
        // @ts-ignore -- select anidado de supabase-js
        nombre: pieza.productos?.nombre ?? "Pieza de joyería",
        cantidad: 1,
        precioVenta: pieza.precio_venta,
        precioCompra: pieza.costo,
        idPieza: pieza.id,
      });
    } else {
      const cantidad = Number(item.cantidad) || 0;
      if (cantidad <= 0) {
        fallidas.push(`producto:${item.idProducto}`);
        continue;
      }
      const { data: producto } = await supabaseAdmin
        .from("productos")
        .select("id, nombre, precio_venta, precio_compra, activo")
        .eq("id", item.idProducto)
        .eq("id_empresa", ID_EMPRESA)
        .maybeSingle();

      if (!producto || !producto.activo) {
        fallidas.push(`producto:${item.idProducto}`);
        continue;
      }
      lineas.push({
        idProducto: producto.id,
        nombre: producto.nombre,
        cantidad,
        precioVenta: producto.precio_venta,
        precioCompra: producto.precio_compra,
      });
    }
  }

  if (fallidas.length > 0) {
    return json(
      { error: "algunos items ya no están disponibles", fallidas },
      409
    );
  }

  const montoTotal = lineas.reduce((acc, l) => acc + l.precioVenta * l.cantidad, 0);
  const idOrdenExterna = crypto.randomUUID();

  // --- 2) Crear la venta "pendiente" ---
  const { data: venta, error: errorVenta } = await supabaseAdmin
    .from("ventas")
    .insert({
      fecha: new Date().toISOString(),
      id_sucursal: ID_SUCURSAL,
      id_empresa: ID_EMPRESA,
      id_cliente: null,
      monto_total: montoTotal,
      sub_total: montoTotal,
      total_impuestos: 0,
      valor_impuesto: 0,
      referencia_tarjeta: "-",
      cantidad_productos: lineas.length,
      estado: "pendiente",
      nro_comprobante: null,
      origen: CANAL,
      id_orden_externa: idOrdenExterna,
    })
    .select()
    .single();

  if (errorVenta || !venta) {
    console.error("Error creando venta pendiente:", errorVenta?.message);
    return json({ error: "no se pudo iniciar el pedido" }, 500);
  }

  // --- 3) Reservar piezas + guardar líneas de stock ---
  const piezasReservadas: number[] = [];
  for (const linea of lineas) {
    if (!linea.idPieza) continue;
    const { error } = await supabaseAdmin.rpc("reservar_pieza", {
      _id_pieza: linea.idPieza,
      _id_venta: venta.id,
      _id_empresa: ID_EMPRESA,
      _id_usuario: null,
    });
    if (error) {
      await anularVenta(venta.id, idOrdenExterna);
      return json(
        { error: `la pieza ${linea.idPieza} ya no está disponible` },
        409
      );
    }
    piezasReservadas.push(linea.idPieza);
  }

  const lineasStock = lineas.filter((l) => !l.idPieza);
  if (lineasStock.length > 0) {
    const { error: errorItems } = await supabaseAdmin
      .from("ecommerce_orden_items")
      .insert(
        lineasStock.map((l) => ({
          origen: CANAL,
          id_orden_externa: idOrdenExterna,
          id_producto: l.idProducto,
          id_almacen: ID_ALMACEN,
          cantidad: l.cantidad,
          precio_venta: l.precioVenta,
          precio_compra: l.precioCompra,
        }))
      );
    if (errorItems) {
      console.error("Error guardando líneas de stock:", errorItems.message);
      await anularVenta(venta.id, idOrdenExterna);
      return json({ error: "no se pudo iniciar el pedido" }, 500);
    }
  }

  // --- 4) Crear la preferencia en Mercado Pago ---
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5180";
  // Mercado Pago rechaza auto_return si back_urls.success no es una URL
  // pública (falla con "back_url.success must be defined" contra
  // localhost) — se omite en desarrollo local, donde el usuario vuelve con
  // el botón propio de Mercado Pago en vez de un redirect automático.
  const esUrlPublica = !siteUrl.includes("localhost");

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: lineas.map((l) => ({
        title: l.nombre,
        quantity: l.cantidad,
        unit_price: l.precioVenta,
        currency_id: MONEDA,
      })),
      external_reference: idOrdenExterna,
      back_urls: {
        success: `${siteUrl}/pago/exito?id=${idOrdenExterna}`,
        failure: `${siteUrl}/pago/fallo?id=${idOrdenExterna}`,
        pending: `${siteUrl}/pago/pendiente?id=${idOrdenExterna}`,
      },
      ...(esUrlPublica ? { auto_return: "approved" } : {}),
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-mercadopago`,
    }),
  });

  if (!mpRes.ok) {
    console.error("Error creando preferencia en Mercado Pago:", await mpRes.text());
    await anularVenta(venta.id, idOrdenExterna);
    return json({ error: "no se pudo iniciar el pago" }, 502);
  }

  const preferencia = await mpRes.json();
  // Con un access token de prueba (TEST-...) hay que redirigir a
  // sandbox_init_point; init_point da "Hubo un error accediendo a esta
  // página" porque no es una compra real. Con un token de producción, se usa
  // init_point normal.
  const esTokenDePrueba = (Deno.env.get("MP_ACCESS_TOKEN") ?? "").startsWith("TEST-");

  return json({
    idOrdenExterna,
    initPoint: esTokenDePrueba ? preferencia.sandbox_init_point : preferencia.init_point,
  });
});
