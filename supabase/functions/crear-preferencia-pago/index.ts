// Recibe el carrito, revalida todo server-side (nunca confía en precios que
// mande el navegador), reserva las piezas de joyería, guarda las líneas de
// producto por cantidad, y crea la preferencia de pago en Mercado Pago.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { json, respuestaCors } from "../_shared/cors.ts";
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

// Dirección de envío: o el id de una guardada del usuario, o los campos
// completos (guest, o "enviar a otra dirección" sin guardar).
interface DireccionInline {
  destinatario: string;
  telefono: string;
  cp: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior?: string | null;
  entreCalles?: string | null;
  referencias?: string | null;
  lat?: number | null;
  lng?: number | null;
}
type EnvioRequest = { idDireccion: number } | DireccionInline;

interface EnvioSnapshot {
  destinatario: string;
  telefono: string;
  cp: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string | null;
  entre_calles: string | null;
  referencias: string | null;
  lat: number | null;
  lng: number | null;
}

const REQUERIDOS_DIRECCION: (keyof DireccionInline)[] = [
  "destinatario", "telefono", "cp", "estado", "municipio",
  "colonia", "calle", "numeroExterior",
];

function snapshotDesdeInline(d: DireccionInline): EnvioSnapshot | { error: string } {
  for (const campo of REQUERIDOS_DIRECCION) {
    if (!String(d[campo] ?? "").trim()) return { error: `falta el campo ${campo}` };
  }
  if (!/^\d{5}$/.test(String(d.cp).trim())) return { error: "el código postal debe tener 5 dígitos" };
  return {
    destinatario: d.destinatario.trim(),
    telefono: d.telefono.trim(),
    cp: String(d.cp).trim(),
    estado: d.estado.trim(),
    municipio: d.municipio.trim(),
    colonia: d.colonia.trim(),
    calle: d.calle.trim(),
    numero_exterior: d.numeroExterior.trim(),
    numero_interior: d.numeroInterior?.trim() || null,
    entre_calles: d.entreCalles?.trim() || null,
    referencias: d.referencias?.trim() || null,
    lat: typeof d.lat === "number" ? d.lat : null,
    lng: typeof d.lng === "number" ? d.lng : null,
  };
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
  await supabaseAdmin
    .from("ecommerce_orden_envio")
    .delete()
    .eq("id_orden_externa", idOrdenExterna);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respuestaCors();
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  let body: { items?: ItemRequest[]; envio?: EnvioRequest };
  try {
    body = await req.json();
  } catch {
    return json({ error: "body inválido" }, 400);
  }

  const items = body.items ?? [];
  if (items.length === 0) return json({ error: "el carrito está vacío" }, 400);

  // --- 0a) Usuario logueado (opcional): el checkout sigue soportando compra
  //     anónima. Si hay sesión, se vincula/crea el cliente del POS y su
  //     id se clava en la venta (crear_venta_externa_piezas hace UPDATE
  //     sobre esta misma fila, así que el id_cliente sobrevive). Un fallo
  //     al vincular NO frena el checkout: se loguea y se sigue como anónimo.
  let idCliente: number | null = null;
  let userId: string | null = null;
  let userNombre: string | null = null;
  let userEmail: string | null = null;
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (jwt) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (user) {
      userId = user.id;
      userEmail = user.email ?? null;
      userNombre =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;
      const { data: idClienteVinculado, error: errorVinculo } =
        await supabaseAdmin.rpc("ecommerce_vincular_cliente", {
          _user_id: user.id,
          _email: userEmail ?? undefined,
          _nombre: userNombre ?? undefined,
        });
      if (errorVinculo) {
        console.error("Error vinculando cliente de ecommerce:", errorVinculo.message);
      } else {
        idCliente = idClienteVinculado as number;
      }
    }
  }

  // --- 0b) Dirección de envío (obligatoria). Guardada del usuario -> se
  //     carga y se verifica que sea suya. Inline -> se validan los campos.
  //     En ambos casos se guarda un snapshot inmutable en ecommerce_orden_envio.
  const envio = body.envio;
  if (!envio) return json({ error: "falta la dirección de envío" }, 400);

  let envioSnapshot: EnvioSnapshot;
  if ("idDireccion" in envio) {
    if (!userId) return json({ error: "sesión requerida para usar una dirección guardada" }, 401);
    const { data: dir } = await supabaseAdmin
      .from("ecommerce_direccion")
      .select("*")
      .eq("id", envio.idDireccion)
      .eq("user_id", userId)
      .maybeSingle();
    if (!dir) return json({ error: "la dirección elegida no existe" }, 404);
    envioSnapshot = {
      destinatario: dir.destinatario,
      telefono: dir.telefono,
      cp: dir.cp,
      estado: dir.estado,
      municipio: dir.municipio,
      colonia: dir.colonia,
      calle: dir.calle,
      numero_exterior: dir.numero_exterior,
      numero_interior: dir.numero_interior,
      entre_calles: dir.entre_calles,
      referencias: dir.referencias,
      lat: dir.lat,
      lng: dir.lng,
    };
  } else {
    const resultado = snapshotDesdeInline(envio);
    if ("error" in resultado) return json({ error: resultado.error }, 400);
    envioSnapshot = resultado;
  }

  // --- 1) Revalidar cada línea contra la base real (nunca el precio del cliente) ---
  const lineas: LineaValidada[] = [];
  const fallidas: string[] = [];

  for (const item of items) {
    if (item.tipo === "pieza") {
      const { data: pieza } = await supabaseAdmin
        .from("piezas_inventario")
        .select("id, id_producto, precio_venta, precio_oferta, costo, estado, productos(nombre)")
        .eq("id", item.idPieza)
        .eq("id_empresa", ID_EMPRESA)
        .maybeSingle();

      if (!pieza || pieza.estado !== "disponible") {
        fallidas.push(`pieza:${item.idPieza}`);
        continue;
      }
      // El precio con oferta (si hay) es el que se cobra y el que
      // crear_venta_externa_piezas vuelve a leer al confirmar el pago
      // (ver 20260910150000_oferta_pieza_y_ficha_joyeria.sql) — nunca el
      // precio que mandó el navegador.
      lineas.push({
        idProducto: pieza.id_producto,
        // @ts-ignore -- select anidado de supabase-js
        nombre: pieza.productos?.nombre ?? "Pieza de joyería",
        cantidad: 1,
        precioVenta: pieza.precio_oferta ?? pieza.precio_venta,
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
      id_cliente: idCliente,
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

  // Snapshot de envío (inmutable: si el usuario después borra/edita la
  // dirección, el pedido igual muestra a dónde se envió).
  const { error: errorEnvio } = await supabaseAdmin
    .from("ecommerce_orden_envio")
    .insert({ id_orden_externa: idOrdenExterna, user_id: userId, ...envioSnapshot });
  if (errorEnvio) {
    console.error("Error guardando el envío:", errorEnvio.message);
    await anularVenta(venta.id, idOrdenExterna);
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
      payer: {
        name: userNombre ?? envioSnapshot.destinatario,
        ...(userEmail ? { email: userEmail } : {}),
        phone: { number: envioSnapshot.telefono },
        address: {
          zip_code: envioSnapshot.cp,
          street_name: envioSnapshot.calle,
          street_number: envioSnapshot.numero_exterior,
        },
      },
      shipments: {
        receiver_address: {
          zip_code: envioSnapshot.cp,
          state_name: envioSnapshot.estado,
          city_name: envioSnapshot.municipio,
          street_name: envioSnapshot.calle,
          street_number: envioSnapshot.numero_exterior,
        },
      },
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
