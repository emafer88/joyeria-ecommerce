import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CrearPreferenciaPago,
  MostrarEstadoPedido,
} from "../supabaseCrud/crudCheckout";
import type { CarritoItem } from "../types/dominio";

export const K_ESTADO_PEDIDO = "ecommerce estado pedido";

export const useCrearPreferenciaMutation = () =>
  useMutation({
    mutationFn: (items: CarritoItem[]) => CrearPreferenciaPago(items),
  });

export const useEstadoPedidoQuery = (idOrdenExterna: string | undefined) =>
  useQuery({
    queryKey: [K_ESTADO_PEDIDO, idOrdenExterna],
    queryFn: () => MostrarEstadoPedido(idOrdenExterna as string),
    enabled: !!idOrdenExterna,
    // El webhook de Mercado Pago puede tardar unos segundos: reintenta
    // mientras el pedido siga "pendiente", con tope para no pollear para siempre.
    refetchInterval: (query) =>
      query.state.data?.estado === "pendiente" ? 3000 : false,
  });
