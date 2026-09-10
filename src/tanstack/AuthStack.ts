// Hooks de TanStack Query para la cuenta del comprador. Mismo patrón que
// CatalogoStack / CheckoutStack.
import { useQuery } from "@tanstack/react-query";
import { MostrarMisPedidos } from "../supabaseCrud/crudAuth";

export const K_MIS_PEDIDOS = "ecommerce mis pedidos";

export const useMisPedidosQuery = (habilitado: boolean) =>
  useQuery({
    queryKey: [K_MIS_PEDIDOS],
    queryFn: MostrarMisPedidos,
    enabled: habilitado,
  });
