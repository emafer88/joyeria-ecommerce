import { Route, Routes } from "react-router-dom";
import { Inicio } from "../pages/Inicio";
import { Catalogo } from "../pages/Catalogo";
import { ProductoDetalle } from "../pages/ProductoDetalle";
import { Carrito } from "../pages/Carrito";
import { Checkout } from "../pages/Checkout";
import { PagoResultado } from "../pages/PagoResultado";
import { EstadoPedidoPagina } from "../pages/EstadoPedidoPagina";
import { Acceso } from "../pages/Acceso";
import { MisPedidos } from "../pages/MisPedidos";
import { MisDirecciones } from "../pages/MisDirecciones";
import { RutaProtegida } from "../components/organismos/RutaProtegida";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/catalogo" element={<Catalogo />} />
      <Route path="/producto/:id" element={<ProductoDetalle />} />
      <Route path="/carrito" element={<Carrito />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/pago/exito" element={<PagoResultado tipo="exito" />} />
      <Route path="/pago/fallo" element={<PagoResultado tipo="fallo" />} />
      <Route path="/pago/pendiente" element={<PagoResultado tipo="pendiente" />} />
      <Route path="/pedido/:idOrdenExterna" element={<EstadoPedidoPagina />} />
      <Route path="/acceso" element={<Acceso />} />
      <Route
        path="/mis-pedidos"
        element={
          <RutaProtegida>
            <MisPedidos />
          </RutaProtegida>
        }
      />
      <Route
        path="/mis-direcciones"
        element={
          <RutaProtegida>
            <MisDirecciones />
          </RutaProtegida>
        }
      />
    </Routes>
  );
}
