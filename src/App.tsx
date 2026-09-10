import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppRouter } from "./router/AppRouter";
import { Header } from "./components/organismos/Header";
import { Footer } from "./components/organismos/Footer";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <Toaster />
      <BrowserRouter>
        <Header />
        <AppRouter />
        <Footer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
