import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppRouter } from "./router/AppRouter";
import { Header } from "./components/organismos/Header";
import { Footer } from "./components/organismos/Footer";
import { useTiendaDisponibleQuery } from "./tanstack/LicenciaStack";
import { TiendaNoDisponible } from "./pages/TiendaNoDisponible";
import { TemaTienda } from "./styles/TemaTienda";
import {
  useDiseno,
  useMarcaDocumento,
  useVistaPreviaDiseno,
} from "./tanstack/DisenoStack";
import { paletaTienda } from "./data/disenoTienda";

const queryClient = new QueryClient();

// Paleta elegida en el admin (o el borrador, si es la vista previa), y
// nombre y logo en la pestaña del navegador.
function Tema() {
  useVistaPreviaDiseno();
  useMarcaDocumento();
  const { paleta } = useDiseno();
  return <TemaTienda $paleta={paletaTienda(paleta)} />;
}

// Cuenta suspendida o plan sin tienda: solo el aviso, nada del catálogo.
function Tienda() {
  const { disponible } = useTiendaDisponibleQuery();
  if (!disponible) return <TiendaNoDisponible />;
  return (
    <>
      <Header />
      <AppRouter />
      <Footer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <Tema />
      <Toaster />
      <BrowserRouter>
        <Tienda />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
