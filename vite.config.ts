import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Puerto fijo (distinto del default 5173, que suele estar ocupado por
// proyecto-joyeria) para que siempre coincida con el secreto SITE_URL usado
// por las Edge Functions de pago (ver supabase/functions/_shared/constantes.ts).
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
})
