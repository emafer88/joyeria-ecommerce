// Favoritos del comprador. Agregar/quitar es insert/delete directo a
// ecommerce_favorito (RLS por user_id hace el resto); listar la ficha
// completa sí necesita la RPC ecommerce_listar_favoritos.
import { supabase } from "./supabase.config";
import type { ProductoCatalogo } from "../types/dominio";

export async function MostrarMisIdsFavoritos(): Promise<number[]> {
  const { data, error } = await supabase
    .from("ecommerce_favorito")
    .select("id_producto");
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => f.id_producto);
}

export async function MostrarFavoritos(): Promise<ProductoCatalogo[]> {
  const { data, error } = await supabase.rpc("ecommerce_listar_favoritos");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioVenta: p.precio_venta,
    idCategoria: p.id_categoria,
    categoria: p.categoria,
    esJoyeria: p.es_joyeria,
    imagenPortada: p.imagen_portada,
    totalDisponible: p.total_disponible,
    destacado: p.destacado,
    precioOferta: p.precio_oferta,
    marca: p.marca,
    etiquetas: p.etiquetas ?? [],
  }));
}

export async function AgregarFavorito(idProducto: number): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_favorito")
    .insert({ id_producto: idProducto });
  if (error) throw new Error(error.message);
}

export async function QuitarFavorito(idProducto: number): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_favorito")
    .delete()
    .eq("id_producto", idProducto);
  if (error) throw new Error(error.message);
}
