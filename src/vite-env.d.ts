/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SUPABASE_URL: string;
  readonly VITE_APP_SUPABASE_ANON_KEY: string;
  /** Google Maps Platform (Maps JS + Places + Geocoding). Opcional: sin
   *  key, el formulario de dirección funciona sin mapa ni lat/lng. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
